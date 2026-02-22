/**
 * Backup Service - Manages local and Google Drive backups
 * Multi-business aware with subscription-based backup blocking
 */

import { openDB, IDBPDatabase } from "idb";
import { BackupData } from "@/types";
import { googleAuth } from "./google-auth";

const DB_NAME = "SellMoreDB";
const DB_VERSION = 4;

export interface BackupStatus {
  lastBackupTime: string | null;
  lastBackupStatus: "success" | "failed" | "pending" | null;
  isHealthy: boolean;
  message: string;
  canBackup: boolean;
  canRestore: boolean;
  subscriptionBlocked: boolean;
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
  previewData: BackupData | null;
  canRevert: boolean;
  revertExpiresAt: number | null;
}

interface SubscriptionStatus {
  active: boolean;
  expired: boolean;
  gracePeriod: boolean;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  daysSinceExpiry: number | null;
}

export class BackupService {
  private db: IDBPDatabase | null = null;
  private restoreState: RestoreState = {
    phase: "idle",
    progress: 0,
    currentDBBackup: null,
    previewData: null,
    canRevert: false,
    revertExpiresAt: null,
  };
  private listeners: Set<(status: RestoreState) => void> = new Set();

  async initDB(): Promise<IDBPDatabase> {
    if (this.db) return this.db;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("items")) {
          db.createObjectStore("items", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("employees")) {
          db.createObjectStore("employees", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", { keyPath: "id" });
          txStore.createIndex("byTimestamp", "timestamp");
          txStore.createIndex("byEmployee", "employeeId");
        }
        if (!db.objectStoreNames.contains("shifts")) {
          db.createObjectStore("shifts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("expenses")) {
          db.createObjectStore("expenses", { keyPath: "id" });
        }
      },
    });

    return this.db;
  }

  private getSubscriptionStatus(businessId: string): SubscriptionStatus {
    if (typeof window === "undefined") {
      return { active: true, expired: false, gracePeriod: false, expiresAt: null, daysUntilExpiry: null, daysSinceExpiry: null };
    }

    const subKey = `subscription_${businessId}`;
    const subData = localStorage.getItem(subKey);

    let expiresAt: string | null = null;

    if (subData) {
      try {
        const parsed = JSON.parse(subData);
        expiresAt = parsed.expiresAt || null;
      } catch (e) {
        return { active: true, expired: false, gracePeriod: false, expiresAt: null, daysUntilExpiry: null, daysSinceExpiry: null };
      }
    }

    if (!expiresAt) {
      return { active: true, expired: false, gracePeriod: false, expiresAt: null, daysUntilExpiry: null, daysSinceExpiry: null };
    }

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const daysSinceExpiry = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays > 0) {
      return { 
        active: true, 
        expired: false, 
        gracePeriod: false, 
        expiresAt, 
        daysUntilExpiry: diffDays,
        daysSinceExpiry: null 
      };
    }

    const GRACE_PERIOD_DAYS = 30;
    const inGracePeriod = daysSinceExpiry <= GRACE_PERIOD_DAYS;

    return {
      active: false,
      expired: !inGracePeriod,
      gracePeriod: inGracePeriod,
      expiresAt,
      daysUntilExpiry: null,
      daysSinceExpiry: daysSinceExpiry,
    };
  }

  private shouldBackup(businessId: string): { allowed: boolean; reason?: string } {
    const status = this.getSubscriptionStatus(businessId);
    
    if (status.active) {
      return { allowed: true };
    }

    if (status.gracePeriod) {
      return { allowed: true, reason: "grace_period" };
    }

    return { allowed: false, reason: "subscription_expired" };
  }

  async getBackupStatus(businessId: string): Promise<BackupStatus> {
    if (typeof window === "undefined") {
      return {
        lastBackupTime: null,
        lastBackupStatus: null,
        isHealthy: true,
        message: "Server environment",
        canBackup: false,
        canRestore: false,
        subscriptionBlocked: false,
      };
    }

    const lastBackupTime = localStorage.getItem(`last_backup_time_${businessId}`) || null;
    const lastBackupStatus = localStorage.getItem(`last_backup_status_${businessId}`) as "success" | "failed" | "pending" | null;

    const subscriptionStatus = this.getSubscriptionStatus(businessId);
    const backupDecision = this.shouldBackup(businessId);

    let isHealthy = true;
    let message = "Backup system ready";
    const canBackup = backupDecision.allowed;
    let canRestore = true;
    const subscriptionBlocked = !backupDecision.allowed && backupDecision.reason === "subscription_expired";

    if (subscriptionStatus.gracePeriod) {
      const daysLeft = 30 - (subscriptionStatus.daysSinceExpiry || 0);
      message = `Subscription expired. ${daysLeft} days remaining in grace period. Backup allowed.`;
    } else if (subscriptionStatus.expired) {
      isHealthy = false;
      message = "Subscription expired. Backup blocked. Please renew to continue backup service.";
      canRestore = true;
    } else if (subscriptionStatus.active && subscriptionStatus.daysUntilExpiry !== null) {
      if (subscriptionStatus.daysUntilExpiry <= 7) {
        message = `Subscription expires in ${subscriptionStatus.daysUntilExpiry} days. Please renew soon.`;
      }
    }

    if (lastBackupTime && subscriptionStatus.active) {
      const lastBackup = new Date(lastBackupTime);
      const daysSinceBackup = Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceBackup > 7) {
        message = `Last backup was ${daysSinceBackup} days ago. Please backup soon.`;
        isHealthy = false;
      }
    }

    let backupInfo: BackupStatus["backupInfo"] = undefined;

    if (lastBackupTime) {
      try {
        const info = localStorage.getItem(`backup_info_${businessId}`);
        if (info) {
          const parsed = JSON.parse(info);
          backupInfo = {
            timestamp: parsed.timestamp,
            size: parsed.size,
            itemCount: parsed.itemCount,
            employeeCount: parsed.employeeCount,
            checksumValid: parsed.checksumValid,
          };
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return {
      lastBackupTime,
      lastBackupStatus,
      isHealthy,
      message,
      canBackup,
      canRestore,
      subscriptionBlocked,
      backupInfo,
    };
  }

  async createBackup(businessId: string): Promise<{ success: boolean; message: string; data?: BackupData }> {
    try {
      const backupDecision = this.shouldBackup(businessId);
      if (!backupDecision.allowed) {
        return { success: false, message: "Backup blocked: Subscription expired" };
      }

      const db = await this.initDB();
      
      const items = await db.getAll("items");
      const employees = await db.getAll("employees");
      const categories = await db.getAll("categories");
      const transactions = await db.getAll("transactions");
      const shifts = await db.getAll("shifts");
      const settings = await db.get("settings", "app") || {};
      const expenses = await db.getAll("expenses");

      const backupData: BackupData = {
        version: 2,
        timestamp: Date.now(),
        businessId,
        items,
        employees,
        categories,
        transactions,
        shifts,
        settings,
        expenses,
        checksum: "",
      };

      const dataStr = JSON.stringify({
        items, employees, categories, transactions, shifts, expenses
      });
      backupData.checksum = await this.generateChecksum(dataStr);

      localStorage.setItem(`last_backup_time_${businessId}`, new Date().toISOString());
      localStorage.setItem(`last_backup_status_${businessId}`, "success");
      localStorage.setItem(`backup_info_${businessId}`, JSON.stringify({
        timestamp: backupData.timestamp,
        size: JSON.stringify(backupData).length,
        itemCount: items.length,
        employeeCount: employees.length,
        checksumValid: true,
      }));

      return { success: true, message: "Backup created successfully", data: backupData };
    } catch (error) {
      localStorage.setItem(`last_backup_status_${businessId}`, "failed");
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Backup failed" 
      };
    }
  }

  async uploadToGoogleDrive(businessId: string, data: BackupData): Promise<{ success: boolean; message: string }> {
    try {
      const backupDecision = this.shouldBackup(businessId);
      if (!backupDecision.allowed) {
        return { success: false, message: "Upload blocked: Subscription expired" };
      }

      if (!googleAuth.isSignedIn()) {
        return { success: false, message: "Not signed in to Google" };
      }

      const fileName = `sell-more-backup-${businessId}-${Date.now()}.json`;
      const fileContent = JSON.stringify(data, null, 2);

      const file = new Blob([fileContent], { type: "application/json" });
      const metadata = {
        name: fileName,
        mimeType: "application/json",
        parents: ["appDataFolder"],
      };

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", file);

      const accessToken = googleAuth.getAccessToken();
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: form,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      localStorage.setItem(`last_backup_file_id_${businessId}`, result.id);
      
      return { success: true, message: "Backup uploaded to Google Drive" };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Upload failed" 
      };
    }
  }

  async listBackups(businessId: string): Promise<Array<{ id: string; name: string; modifiedTime: string; size: number }>> {
    try {
      if (!googleAuth.isSignedIn()) {
        return [];
      }

      const accessToken = googleAuth.getAccessToken();
      const query = encodeURIComponent(`name contains 'sell-more-backup-${businessId}' and 'appDataFolder' in parents`);
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list backups: ${response.statusText}`);
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error("Error listing backups:", error);
      return [];
    }
  }

  async downloadBackup(fileId: string): Promise<BackupData | null> {
    try {
      if (!googleAuth.isSignedIn()) {
        return null;
      }

      const accessToken = googleAuth.getAccessToken();
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data as BackupData;
    } catch (error) {
      console.error("Error downloading backup:", error);
      return null;
    }
  }

  async restoreFromBackup(businessId: string, data: BackupData): Promise<{ success: boolean; message: string }> {
    try {
      const currentBackup = await this.createBackup(`${businessId}-revert-${Date.now()}`);
      if (currentBackup.success && currentBackup.data) {
        this.restoreState.currentDBBackup = JSON.stringify(currentBackup.data);
        this.restoreState.canRevert = true;
        this.restoreState.revertExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
      }

      const db = await this.initDB();

      const tx = db.transaction(["items", "employees", "categories", "transactions", "shifts", "expenses"], "readwrite");
      await Promise.all([
        tx.objectStore("items").clear(),
        tx.objectStore("employees").clear(),
        tx.objectStore("categories").clear(),
        tx.objectStore("transactions").clear(),
        tx.objectStore("shifts").clear(),
        tx.objectStore("expenses").clear(),
      ]);
      await tx.done;

      if (data.items?.length) {
        const itemTx = db.transaction("items", "readwrite");
        for (const item of data.items) {
          await itemTx.store.put(item);
        }
        await itemTx.done;
      }

      if (data.employees?.length) {
        const empTx = db.transaction("employees", "readwrite");
        for (const emp of data.employees) {
          await empTx.store.put(emp);
        }
        await empTx.done;
      }

      if (data.categories?.length) {
        const catTx = db.transaction("categories", "readwrite");
        for (const cat of data.categories) {
          await catTx.store.put(cat);
        }
        await catTx.done;
      }

      if (data.transactions?.length) {
        const txStore = db.transaction("transactions", "readwrite");
        for (const transaction of data.transactions) {
          await txStore.store.put(transaction);
        }
        await txStore.done;
      }

      if (data.shifts?.length) {
        const shiftTx = db.transaction("shifts", "readwrite");
        for (const shift of data.shifts) {
          await shiftTx.store.put(shift);
        }
        await shiftTx.done;
      }

      if (data.expenses?.length) {
        const expenseTx = db.transaction("expenses", "readwrite");
        for (const expense of data.expenses) {
          await expenseTx.store.put(expense);
        }
        await expenseTx.done;
      }

      if (data.settings) {
        await db.put("settings", data.settings, "app");
      }

      return { success: true, message: "Backup restored successfully" };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Restore failed" 
      };
    }
  }

  async revertRestore(businessId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.restoreState.canRevert || !this.restoreState.currentDBBackup) {
        return { success: false, message: "No revert available" };
      }

      if (this.restoreState.revertExpiresAt && Date.now() > this.restoreState.revertExpiresAt) {
        return { success: false, message: "Revert period has expired" };
      }

      const data = JSON.parse(this.restoreState.currentDBBackup) as BackupData;
      const result = await this.restoreFromBackup(businessId, data);

      if (result.success) {
        this.restoreState.canRevert = false;
        this.restoreState.currentDBBackup = null;
      }

      return result;
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Revert failed" 
      };
    }
  }

  async storeBackupForPreview(data: BackupData): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem("preview_backup_data", JSON.stringify(data));
    }
  }

  async getStoredBackup(): Promise<BackupData | null> {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem("preview_backup_data");
    return data ? JSON.parse(data) : null;
  }

  async clearStoredBackup(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("preview_backup_data");
    }
  }

  async exportEssentialData(): Promise<string> {
    const db = await this.initDB();
    const items = await db.getAll("items");
    const employees = await db.getAll("employees");
    
    const data = {
      items: items.slice(0, 100),
      employees: employees.slice(0, 50),
      exportDate: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  async checkBackupAvailability(): Promise<{ available: boolean; message: string }> {
    const status = await this.getBackupStatus("default");
    return {
      available: status.canBackup,
      message: status.message,
    };
  }

  async startRestore(fileId: string): Promise<{ success: boolean; message: string }> {
    const data = await this.downloadBackup(fileId);
    if (!data) {
      return { success: false, message: "Failed to download backup" };
    }

    const result = await this.restoreFromBackup("default", data);
    return result;
  }

  async finalizeRestore(): Promise<{ success: boolean; message: string }> {
    this.restoreState.phase = "complete";
    this.restoreState.progress = 100;
    this.notifyListeners();
    return { success: true, message: "Restore finalized" };
  }

  async cancelRestore(): Promise<{ success: boolean; message: string }> {
    this.restoreState.phase = "idle";
    this.restoreState.progress = 0;
    this.restoreState.previewData = null;
    this.notifyListeners();
    return { success: true, message: "Restore cancelled" };
  }

  async canRevert(): Promise<{ canRevert: boolean; expiresAt: number | null }> {
    return {
      canRevert: this.restoreState.canRevert,
      expiresAt: this.restoreState.revertExpiresAt,
    };
  }

  async promoteCandidate(): Promise<{ success: boolean; message: string }> {
    this.restoreState.canRevert = false;
    this.restoreState.currentDBBackup = null;
    return { success: true, message: "Backup promoted" };
  }

  async loadPreview(fileId: string): Promise<{ success: boolean; data?: BackupData; message: string }> {
    const data = await this.downloadBackup(fileId);
    if (data) {
      this.restoreState.previewData = data;
      this.restoreState.phase = "preview";
      this.notifyListeners();
      return { success: true, data, message: "Preview loaded" };
    }
    return { success: false, message: "Failed to load preview" };
  }

  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.restoreState));
  }

  subscribe(listener: (status: RestoreState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const backupService = new BackupService();