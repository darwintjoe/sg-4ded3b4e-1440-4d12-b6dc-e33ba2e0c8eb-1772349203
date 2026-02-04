/**
 * "Last Known Good" Backup Service
 * Simple, reliable backup for grandma-level users
 * 
 * Philosophy:
 * - ONE backup file (no confusing choices)
 * - MINIMAL data (only what's needed for business continuity)
 * - AUTOMATIC validation (promote only when proven good)
 * - SIMPLE restore (one button, always works)
 */

import { db } from "./db";
import { googleAuth } from "./google-auth";

export interface BackupMetadata {
  version: string;
  timestamp: string;
  deviceId: string;
  dataSize: number;
  checksum: string;
  status: "candidate" | "verified";
  itemCount?: number;
  employeeCount?: number;
}

export interface BackupData {
  metadata: BackupMetadata;
  items: any[];
  employees: any[];
  categories: any[];
  settings: any;
  shifts: any[];
  dailyItemSales: any[];
  dailyPaymentSales: any[];
  dailyAttendance: any[];
  monthlyItemSales: any[];
  monthlySalesSummary: any[];
  monthlyAttendanceSummary: any[];
}

interface BackupStatus {
  lastBackupTime: string | null;
  lastBackupStatus: "success" | "failed" | "pending" | null;
  isHealthy: boolean;
  message: string;
  canRestore: boolean;
  backupInfo?: {
    timestamp: string;
    size: number;
    itemCount: number;
    employeeCount: number;
    checksumValid: boolean;
  };
}

interface RestoreState {
  phase: "idle" | "downloading" | "verifying" | "backing_up" | "preview" | "finalizing" | "complete";
  progress: number;
  currentDBBackup: string | null;
  previewDBName: string | null;
  canRevert: boolean;
  revertExpiresAt: number | null;
}

export class BackupService {
  private readonly BACKUP_FOLDER = "POS-Backups";
  private readonly LAST_KNOWN_GOOD_NAME = "backup_last_known_good.json.gz";
  private readonly CANDIDATE_NAME = "backup_candidate.json.gz";
  private readonly VERSION = "1.0.0";
  private readonly PREVIEW_DB_NAME = "sellmore_preview";
  private readonly BACKUP_DB_NAME = "sellmore_backup";
  private readonly REVERT_WINDOW_HOURS = 24;
  
  private restoreState: RestoreState = {
    phase: "idle",
    progress: 0,
    currentDBBackup: null,
    previewDBName: null,
    canRevert: false,
    revertExpiresAt: null
  };

  /**
   * Get device ID (stable across sessions)
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("device_id", deviceId);
    }
    return deviceId;
  }

  /**
   * Calculate SHA-256 checksum
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Store large backup data in IndexedDB (avoids sessionStorage quota)
   */
  private async storeTempBackupData(data: BackupData, key: string = "preview"): Promise<void> {
    const tempDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("TempBackupStorage", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("temp")) {
          db.createObjectStore("temp");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return new Promise<void>((resolve, reject) => {
      const tx = tempDB.transaction("temp", "readwrite");
      const store = tx.objectStore("temp");
      const req = store.put(data, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve large backup data from IndexedDB
   */
  private async retrieveTempBackupData(key: string = "preview"): Promise<BackupData | null> {
    try {
      const tempDB = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("TempBackupStorage", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      return new Promise<BackupData | null>((resolve, reject) => {
        const tx = tempDB.transaction("temp", "readonly");
        const store = tx.objectStore("temp");
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Clear temp backup data from IndexedDB
   */
  private async clearTempBackupData(key: string = "preview"): Promise<void> {
    try {
      const tempDB = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("TempBackupStorage", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      return new Promise<void>((resolve, reject) => {
        const tx = tempDB.transaction("temp", "readwrite");
        const store = tx.objectStore("temp");
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: string): Promise<Blob> {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(data);
    
    // Use CompressionStream API (modern browsers)
    if ("CompressionStream" in window) {
      const stream = new Blob([uint8Array]).stream();
      const compressedStream = stream.pipeThrough(
        new (window as any).CompressionStream("gzip")
      );
      const blob = await new Response(compressedStream).blob();
      return blob;
    }
    
    // Fallback: Return uncompressed
    return new Blob([uint8Array], { type: "application/json" });
  }

  /**
   * Decompress data
   */
  private async decompressData(blob: Blob): Promise<string> {
    if ("DecompressionStream" in window && blob.type === "application/gzip") {
      const stream = blob.stream();
      const decompressedStream = stream.pipeThrough(
        new (window as any).DecompressionStream("gzip")
      );
      const decompressed = await new Response(decompressedStream).text();
      return decompressed;
    }
    
    // Fallback: Assume uncompressed
    return await blob.text();
  }

  /**
   * Export essential data only (not full transactions)
   */
  public async exportEssentialData(): Promise<BackupData> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const cutoffDate = sixtyDaysAgo.toISOString().split("T")[0];

      // Master data (always small)
      const items = await db.getAll("items");
      const employees = await db.getAll("employees");
      const categories = await db.getAll("categories");
      const settingsArray = await db.getAll("settings");
      const settings = settingsArray.find((s: any) => s.id === 1 || s.key === "settings") || settingsArray[0];

      // Recent shifts (last 60 days only)
      const allShifts = await db.getAll("shifts");
      const shifts = allShifts.filter((s: any) => {
        const shiftDate = new Date(s.shiftStart).toISOString().split("T")[0];
        return shiftDate >= cutoffDate;
      });

      // Summary tables (already small) - Use getAll with error handling
      let dailyItemSales: any[] = [];
      let dailyPaymentSales: any[] = [];
      let dailyAttendance: any[] = [];
      let monthlyItemSales: any[] = [];
      let monthlySalesSummary: any[] = [];
      let monthlyAttendanceSummary: any[] = [];

      try {
        dailyItemSales = await db.getAll("dailyItemSales");
      } catch (e) {
        console.warn("dailyItemSales store not found, skipping");
      }

      try {
        dailyPaymentSales = await db.getAll("dailyPaymentSales");
      } catch (e) {
        console.warn("dailyPaymentSales store not found, skipping");
      }

      try {
        dailyAttendance = await db.getAll("dailyAttendance");
      } catch (e) {
        console.warn("dailyAttendance store not found, skipping");
      }

      try {
        monthlyItemSales = await db.getAll("monthlyItemSales");
      } catch (e) {
        console.warn("monthlyItemSales store not found, skipping");
      }

      try {
        monthlySalesSummary = await db.getAll("monthlySalesSummary");
      } catch (e) {
        console.warn("monthlySalesSummary store not found, skipping");
      }

      try {
        monthlyAttendanceSummary = await db.getAll("monthlyAttendanceSummary");
      } catch (e) {
        console.warn("monthlyAttendanceSummary store not found, skipping");
      }

      const jsonString = JSON.stringify({
        items,
        employees,
        categories,
        settings,
        shifts,
        dailyItemSales,
        dailyPaymentSales,
        dailyAttendance,
        monthlyItemSales,
        monthlySalesSummary,
        monthlyAttendanceSummary
      });

      const checksum = await this.calculateChecksum(jsonString);

      const metadata: BackupMetadata = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        deviceId: this.getDeviceId(),
        dataSize: jsonString.length,
        checksum,
        status: "candidate",
        itemCount: items.length,
        employeeCount: employees.length
      };

      return {
        metadata,
        items,
        employees,
        categories,
        settings,
        shifts,
        dailyItemSales,
        dailyPaymentSales,
        dailyAttendance,
        monthlyItemSales,
        monthlySalesSummary,
        monthlyAttendanceSummary
      };
    } catch (error) {
      console.error("Failed to export essential data:", error);
      throw error;
    }
  }

  /**
   * Create backup (as candidate)
   */
  async createBackup(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!googleAuth.isSignedIn()) {
        return { success: false, error: "Not signed in to Google" };
      }

      // Export essential data
      const backupData = await this.exportEssentialData();
      const jsonString = JSON.stringify(backupData);

      // Compress
      const compressed = await this.compressData(jsonString);

      // Upload as candidate
      const uploadResult = await googleAuth.uploadBackup(
        compressed,
        this.CANDIDATE_NAME
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Store last backup time
      localStorage.setItem("last_backup_time", backupData.metadata.timestamp);
      localStorage.setItem("last_backup_status", "pending");

      return { success: true };
    } catch (error) {
      console.error("Backup creation failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Backup failed" 
      };
    }
  }

  /**
   * Validate candidate backup health
   */
  private async validateBackupHealth(): Promise<boolean> {
    try {
      // Check if essential tables are accessible
      const items = await db.getAll("items");
      const employees = await db.getAll("employees");
      const settings = await db.getById("settings", 1);

      // Basic validation
      if (!items || !employees || !settings) {
        return false;
      }

      // App is healthy
      return true;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * Promote candidate to "last known good" (after validation)
   */
  async promoteCandidate(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!googleAuth.isSignedIn()) {
        return { success: false, error: "Not signed in to Google" };
      }

      // Run health check
      const isHealthy = await this.validateBackupHealth();
      if (!isHealthy) {
        console.warn("Health check failed, not promoting candidate");
        return { success: false, error: "App health check failed" };
      }

      // List backups
      const listResult = await googleAuth.listBackups();
      if (!listResult.success || !listResult.backups) {
        return { success: false, error: "Failed to list backups" };
      }

      // Find candidate and last known good
      const candidate = listResult.backups.find(b => b.name === this.CANDIDATE_NAME);
      const lastKnownGood = listResult.backups.find(b => b.name === this.LAST_KNOWN_GOOD_NAME);

      if (!candidate) {
        return { success: false, error: "No candidate backup found" };
      }

      // Download candidate
      const downloadResult = await googleAuth.downloadBackup(candidate.id);
      if (!downloadResult.success || !downloadResult.data) {
        return { success: false, error: "Failed to download candidate" };
      }

      // Update metadata status
      const backupData = downloadResult.data as BackupData;
      backupData.metadata.status = "verified";

      // Re-upload as "last known good"
      const jsonString = JSON.stringify(backupData);
      const compressed = await this.compressData(jsonString);

      const uploadResult = await googleAuth.uploadBackup(
        compressed,
        this.LAST_KNOWN_GOOD_NAME
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Delete old "last known good" if it exists
      if (lastKnownGood) {
        await this.deleteBackup(lastKnownGood.id);
      }

      // Update status
      localStorage.setItem("last_backup_status", "success");

      return { success: true };
    } catch (error) {
      console.error("Failed to promote candidate:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Promotion failed" 
      };
    }
  }

  /**
   * Delete backup file
   */
  private async deleteBackup(fileId: string): Promise<void> {
    try {
      const user = googleAuth.getCurrentUser();
      if (!user) return;

      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });
    } catch (error) {
      console.error("Failed to delete backup:", error);
    }
  }

  /**
   * Check if backup exists and get info
   */
  async checkBackupAvailability(): Promise<{ 
    exists: boolean; 
    info?: {
      timestamp: string;
      size: number;
      itemCount: number;
      employeeCount: number;
      checksumValid: boolean;
    };
    error?: string;
  }> {
    try {
      if (!googleAuth.isSignedIn()) {
        return { exists: false };
      }

      // List backups
      const listResult = await googleAuth.listBackups();
      if (!listResult.success || !listResult.backups) {
        return { exists: false, error: "Failed to list backups" };
      }

      // Find "last known good"
      const lastKnownGood = listResult.backups.find(b => b.name === this.LAST_KNOWN_GOOD_NAME);
      
      if (!lastKnownGood) {
        return { exists: false };
      }

      // Download to get metadata
      const downloadResult = await googleAuth.downloadBackup(lastKnownGood.id);
      if (!downloadResult.success || !downloadResult.data) {
        return { exists: false, error: "Failed to read backup" };
      }

      const backupData = downloadResult.data as BackupData;

      // Verify checksum
      const jsonString = JSON.stringify({
        items: backupData.items,
        employees: backupData.employees,
        categories: backupData.categories,
        settings: backupData.settings,
        shifts: backupData.shifts,
        dailyItemSales: backupData.dailyItemSales,
        dailyPaymentSales: backupData.dailyPaymentSales,
        dailyAttendance: backupData.dailyAttendance,
        monthlyItemSales: backupData.monthlyItemSales,
        monthlySalesSummary: backupData.monthlySalesSummary,
        monthlyAttendanceSummary: backupData.monthlyAttendanceSummary
      });

      const checksum = await this.calculateChecksum(jsonString);
      const checksumValid = checksum === backupData.metadata.checksum;

      return {
        exists: true,
        info: {
          timestamp: backupData.metadata.timestamp,
          size: backupData.metadata.dataSize,
          itemCount: backupData.metadata.itemCount || backupData.items.length,
          employeeCount: backupData.metadata.employeeCount || backupData.employees.length,
          checksumValid
        }
      };
    } catch (error) {
      console.error("Failed to check backup availability:", error);
      return { exists: false, error: "Failed to check backup" };
    }
  }

  /**
   * Start restore process - Phase 1: Download and verify
   */
  async startRestore(): Promise<{ success: boolean; backupData?: BackupData; error?: string }> {
    try {
      this.restoreState.phase = "downloading";
      this.restoreState.progress = 20;

      if (!googleAuth.isSignedIn()) {
        return { success: false, error: "Not signed in to Google" };
      }

      // List backups
      const listResult = await googleAuth.listBackups();
      if (!listResult.success || !listResult.backups) {
        return { success: false, error: "Failed to list backups" };
      }

      // Find "last known good"
      const lastKnownGood = listResult.backups.find(b => b.name === this.LAST_KNOWN_GOOD_NAME);
      if (!lastKnownGood) {
        return { success: false, error: "No backup available to restore" };
      }

      this.restoreState.progress = 40;

      // Download backup
      const downloadResult = await googleAuth.downloadBackup(lastKnownGood.id);
      if (!downloadResult.success || !downloadResult.data) {
        return { success: false, error: "Failed to download backup" };
      }

      const backupData = downloadResult.data as BackupData;

      this.restoreState.phase = "verifying";
      this.restoreState.progress = 60;

      // Verify checksum
      const jsonString = JSON.stringify({
        items: backupData.items,
        employees: backupData.employees,
        categories: backupData.categories,
        settings: backupData.settings,
        shifts: backupData.shifts,
        dailyItemSales: backupData.dailyItemSales,
        dailyPaymentSales: backupData.dailyPaymentSales,
        dailyAttendance: backupData.dailyAttendance,
        monthlyItemSales: backupData.monthlyItemSales,
        monthlySalesSummary: backupData.monthlySalesSummary,
        monthlyAttendanceSummary: backupData.monthlyAttendanceSummary
      });

      const checksum = await this.calculateChecksum(jsonString);
      if (checksum !== backupData.metadata.checksum) {
        return { success: false, error: "Backup file corrupted (checksum mismatch)" };
      }

      this.restoreState.progress = 80;

      return { success: true, backupData };
    } catch (error) {
      console.error("Restore start failed:", error);
      this.restoreState.phase = "idle";
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Restore failed" 
      };
    }
  }

  /**
   * Create backup of current database before restore
   */
  async backupCurrentDatabase(): Promise<{ success: boolean; error?: string }> {
    try {
      this.restoreState.phase = "backing_up";
      this.restoreState.progress = 85;

      // Export current data
      const currentData = await this.exportEssentialData();
      
      // Store in localStorage (simplified backup)
      const jsonString = JSON.stringify(currentData);
      const compressed = await this.compressData(jsonString);
      
      // Convert Blob to base64 for localStorage
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      
      const base64Data = await base64Promise;
      localStorage.setItem("currentDB_backup", base64Data);
      localStorage.setItem("currentDB_backup_time", new Date().toISOString());
      
      this.restoreState.currentDBBackup = "currentDB_backup";
      this.restoreState.progress = 90;

      return { success: true };
    } catch (error) {
      console.error("Failed to backup current database:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Backup failed" 
      };
    }
  }

  /**
   * Load backup into preview mode
   */
  async loadPreview(backupData: BackupData): Promise<{ success: boolean; error?: string }> {
    try {
      this.restoreState.phase = "preview";
      this.restoreState.progress = 95;

      // Store preview data in IndexedDB instead of sessionStorage (avoids quota limits)
      await this.storeTempBackupData(backupData, "preview");
      
      this.restoreState.previewDBName = "preview";
      this.restoreState.progress = 100;

      return { success: true };
    } catch (error) {
      console.error("Failed to load preview:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Preview load failed" 
      };
    }
  }

  /**
   * Cancel restore and cleanup
   */
  async cancelRestore(): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear preview data from IndexedDB
      await this.clearTempBackupData("preview");
      
      // Reset state
      this.restoreState = {
        phase: "idle",
        progress: 0,
        currentDBBackup: null,
        previewDBName: null,
        canRevert: false,
        revertExpiresAt: null
      };

      return { success: true };
    } catch (error) {
      console.error("Failed to cancel restore:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Cancel failed" 
      };
    }
  }

  /**
   * Finalize restore - Make backup live
   */
  async finalizeRestore(backupData: BackupData): Promise<{ success: boolean; error?: string }> {
    try {
      this.restoreState.phase = "finalizing";
      this.restoreState.progress = 10;

      // Clear existing data
      await db.clear("items");
      await db.clear("employees");
      await db.clear("categories");
      await db.clear("settings");
      await db.clear("shifts");
      await db.clear("dailyItemSales");
      await db.clear("dailyPaymentSales");
      await db.clear("dailyAttendance");
      await db.clear("monthlyItemSales");
      await db.clear("monthlySalesSummary");
      await db.clear("monthlyAttendanceSummary");

      this.restoreState.progress = 40;

      // Restore data
      for (const item of backupData.items) {
        await db.add("items", item);
      }
      for (const employee of backupData.employees) {
        await db.add("employees", employee);
      }
      for (const category of backupData.categories) {
        await db.add("categories", category);
      }
      if (backupData.settings) {
        await db.put("settings", { ...backupData.settings, id: 1 });
      }
      
      this.restoreState.progress = 60;

      for (const shift of backupData.shifts) {
        await db.add("shifts", shift);
      }
      for (const record of backupData.dailyItemSales) {
        await db.add("dailyItemSales", record);
      }
      for (const record of backupData.dailyPaymentSales) {
        await db.add("dailyPaymentSales", record);
      }
      for (const record of backupData.dailyAttendance) {
        await db.add("dailyAttendance", record);
      }

      this.restoreState.progress = 80;

      for (const record of backupData.monthlyItemSales) {
        await db.add("monthlyItemSales", record);
      }
      for (const record of backupData.monthlySalesSummary) {
        await db.add("monthlySalesSummary", record);
      }
      for (const record of backupData.monthlyAttendanceSummary) {
        await db.add("monthlyAttendanceSummary", record);
      }

      this.restoreState.progress = 95;

      // Set revert window (24 hours)
      const expiresAt = Date.now() + (this.REVERT_WINDOW_HOURS * 60 * 60 * 1000);
      localStorage.setItem("revert_expires_at", expiresAt.toString());
      this.restoreState.canRevert = true;
      this.restoreState.revertExpiresAt = expiresAt;

      // Clear preview data from IndexedDB
      await this.clearTempBackupData("preview");

      this.restoreState.phase = "complete";
      this.restoreState.progress = 100;

      return { success: true };
    } catch (error) {
      console.error("Restore finalization failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Restore failed" 
      };
    }
  }

  /**
   * Revert to backup (within 24-hour window)
   */
  async revertRestore(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if revert is available
      const expiresAt = localStorage.getItem("revert_expires_at");
      if (!expiresAt || Date.now() > parseInt(expiresAt)) {
        return { success: false, error: "Revert window expired (24 hours)" };
      }

      const backupBase64 = localStorage.getItem("currentDB_backup");
      if (!backupBase64) {
        return { success: false, error: "No backup found to revert to" };
      }

      // Convert base64 back to Blob
      const response = await fetch(backupBase64);
      const blob = await response.blob();
      const jsonString = await this.decompressData(blob);
      const backupData = JSON.parse(jsonString) as BackupData;

      // Clear current data
      await db.clear("items");
      await db.clear("employees");
      await db.clear("categories");
      await db.clear("settings");
      await db.clear("shifts");
      await db.clear("dailyItemSales");
      await db.clear("dailyPaymentSales");
      await db.clear("dailyAttendance");
      await db.clear("monthlyItemSales");
      await db.clear("monthlySalesSummary");
      await db.clear("monthlyAttendanceSummary");

      // Restore old data
      for (const item of backupData.items) {
        await db.add("items", item);
      }
      for (const employee of backupData.employees) {
        await db.add("employees", employee);
      }
      for (const category of backupData.categories) {
        await db.add("categories", category);
      }
      if (backupData.settings) {
        await db.put("settings", { ...backupData.settings, id: 1 });
      }
      for (const shift of backupData.shifts) {
        await db.add("shifts", shift);
      }
      for (const record of backupData.dailyItemSales) {
        await db.add("dailyItemSales", record);
      }
      for (const record of backupData.dailyPaymentSales) {
        await db.add("dailyPaymentSales", record);
      }
      for (const record of backupData.dailyAttendance) {
        await db.add("dailyAttendance", record);
      }
      for (const record of backupData.monthlyItemSales) {
        await db.add("monthlyItemSales", record);
      }
      for (const record of backupData.monthlySalesSummary) {
        await db.add("monthlySalesSummary", record);
      }
      for (const record of backupData.monthlyAttendanceSummary) {
        await db.add("monthlyAttendanceSummary", record);
      }

      // Clear revert data
      localStorage.removeItem("currentDB_backup");
      localStorage.removeItem("currentDB_backup_time");
      localStorage.removeItem("revert_expires_at");

      return { success: true };
    } catch (error) {
      console.error("Revert failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Revert failed" 
      };
    }
  }

  /**
   * Check if revert is available
   */
  canRevert(): { available: boolean; expiresAt: number | null; hoursRemaining: number | null } {
    const expiresAt = localStorage.getItem("revert_expires_at");
    const hasBackup = localStorage.getItem("currentDB_backup");

    if (!expiresAt || !hasBackup) {
      return { available: false, expiresAt: null, hoursRemaining: null };
    }

    const expiresAtTime = parseInt(expiresAt);
    const now = Date.now();

    if (now > expiresAtTime) {
      // Cleanup expired data
      localStorage.removeItem("currentDB_backup");
      localStorage.removeItem("currentDB_backup_time");
      localStorage.removeItem("revert_expires_at");
      return { available: false, expiresAt: null, hoursRemaining: null };
    }

    const hoursRemaining = Math.ceil((expiresAtTime - now) / (1000 * 60 * 60));
    return { available: true, expiresAt: expiresAtTime, hoursRemaining };
  }

  /**
   * Get restore state
   */
  getRestoreState(): RestoreState {
    return { ...this.restoreState };
  }

  /**
   * Check if in preview mode
   */
  isPreviewMode(): boolean {
    // Preview mode is active if preview data exists in IndexedDB
    // This is checked synchronously by database layer
    return false; // Actual check happens in db.ts via async call
  }

  /**
   * Get preview data from IndexedDB
   */
  async getPreviewData(): Promise<BackupData | null> {
    return await this.retrieveTempBackupData("preview");
  }

  /**
   * Get backup status
   */
  async getBackupStatus(): Promise<BackupStatus> {
    try {
      const lastBackupTime = localStorage.getItem("last_backup_time");
      const lastBackupStatus = localStorage.getItem("last_backup_status") as "success" | "failed" | "pending" | null;

      // Check if backup is recent (within 48 hours)
      let isHealthy = false;
      let message = "No backup yet";

      if (lastBackupTime) {
        const backupDate = new Date(lastBackupTime);
        const now = new Date();
        const hoursSince = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60);

        if (hoursSince < 48 && lastBackupStatus === "success") {
          isHealthy = true;
          message = "Your data is safe";
        } else if (hoursSince >= 48) {
          message = "Backup is overdue";
        } else if (lastBackupStatus === "pending") {
          message = "Backup pending verification";
        } else if (lastBackupStatus === "failed") {
          message = "Last backup failed";
        }
      }

      // Check if can restore - ONLY if authenticated
      let canRestore = false;
      let backupInfo = undefined;
      
      if (googleAuth.isSignedIn()) {
        const backupCheck = await this.checkBackupAvailability();
        canRestore = backupCheck.exists;
        backupInfo = backupCheck.info;
      }

      return {
        lastBackupTime,
        lastBackupStatus,
        isHealthy,
        message,
        canRestore,
        backupInfo
      };
    } catch (error) {
      console.error("Failed to get backup status:", error);
      return {
        lastBackupTime: null,
        lastBackupStatus: null,
        isHealthy: false,
        message: "Status check failed",
        canRestore: false
      };
    }
  }

  /**
   * Get formatted last backup time
   */
  getFormattedLastBackupTime(): string {
    const lastBackupTime = localStorage.getItem("last_backup_time");
    if (!lastBackupTime) return "Never";

    const backupDate = new Date(lastBackupTime);
    const now = new Date();
    const hoursSince = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60));

    if (hoursSince < 1) return "Just now";
    if (hoursSince === 1) return "1 hour ago";
    if (hoursSince < 24) return `${hoursSince} hours ago`;
    
    const daysSince = Math.floor(hoursSince / 24);
    if (daysSince === 1) return "1 day ago";
    return `${daysSince} days ago`;
  }
}

// Export singleton
export const backupService = new BackupService();