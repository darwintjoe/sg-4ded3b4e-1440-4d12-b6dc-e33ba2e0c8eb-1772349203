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

import { db } from "@/lib/db";
import { googleAuth } from "@/lib/google-auth";

interface BackupMetadata {
  version: string;
  timestamp: string;
  deviceId: string;
  dataSize: number;
  checksum: string;
  status: "candidate" | "verified";
}

interface BackupData {
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
}

class BackupService {
  private readonly BACKUP_FOLDER = "POS-Backups";
  private readonly LAST_KNOWN_GOOD_NAME = "backup_last_known_good.json.gz";
  private readonly CANDIDATE_NAME = "backup_candidate.json.gz";
  private readonly VERSION = "1.0.0";
  
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
  private async exportEssentialData(): Promise<BackupData> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const cutoffDate = sixtyDaysAgo.toISOString().split("T")[0];

      // Master data (always small)
      const items = await db.getAll("items");
      const employees = await db.getAll("employees");
      const categories = await db.getAll("categories");
      // Fix: db.get doesn't exist, use getAll for settings which is a store, or implement get
      // Assuming settings is a store with key 1
      const settingsArray = await db.getAll("settings");
      const settings = settingsArray.find((s: any) => s.id === 1);

      // Recent shifts (last 60 days only)
      const allShifts = await db.getAll("shifts");
      const shifts = allShifts.filter((s: any) => {
        const shiftDate = new Date(s.shiftStart).toISOString().split("T")[0];
        return shiftDate >= cutoffDate;
      });

      // Summary tables (already small)
      const dailyItemSales = await db.getAll("dailyItemSales");
      const dailyPaymentSales = await db.getAll("dailyPaymentSales");
      const dailyAttendance = await db.getAll("dailyAttendance");
      const monthlyItemSales = await db.getAll("monthlyItemSales");
      const monthlySalesSummary = await db.getAll("monthlySalesSummary");
      const monthlyAttendanceSummary = await db.getAll("monthlyAttendanceSummary");

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
        status: "candidate"
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
      // Google Drive delete API
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
   * Restore from "last known good" backup
   */
  async restoreBackup(): Promise<{ success: boolean; error?: string }> {
    try {
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

      // Download backup
      const downloadResult = await googleAuth.downloadBackup(lastKnownGood.id);
      if (!downloadResult.success || !downloadResult.data) {
        return { success: false, error: "Failed to download backup" };
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
      if (checksum !== backupData.metadata.checksum) {
        return { success: false, error: "Backup file corrupted (checksum mismatch)" };
      }

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
        // Fix: db.put might verify key, ensuring settings object has id
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

      return { success: true };
    } catch (error) {
      console.error("Restore failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Restore failed" 
      };
    }
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

      // Check if can restore
      let canRestore = false;
      if (googleAuth.isSignedIn()) {
        const listResult = await googleAuth.listBackups();
        if (listResult.success && listResult.backups) {
          canRestore = listResult.backups.some(b => b.name === this.LAST_KNOWN_GOOD_NAME);
        }
      }

      return {
        lastBackupTime,
        lastBackupStatus,
        isHealthy,
        message,
        canRestore
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