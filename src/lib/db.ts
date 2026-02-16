// src/lib/db.ts - IndexedDB wrapper with optimized upsert for mobile devices

import {
  Item,
  Employee,
  Transaction,
  Shift,
  Attendance,
  DailyItemSales,
  DailyPaymentSales,
  MonthlyItemSales,
  MonthlyPaymentSales,
  MonthlySalesSummary,
  Settings,
} from "@/types";

export class Database {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // Helper to check for preview mode
  private isPreviewMode(): boolean {
    return typeof window !== 'undefined' && sessionStorage.getItem("preview_mode") === "true";
  }

  // Helper to get preview data
  private getPreviewData(): any {
    if (typeof window === 'undefined') return null;
    const dataStr = sessionStorage.getItem("preview_data");
    return dataStr ? JSON.parse(dataStr) : null;
  }

  async init(): Promise<void> {
    // In preview mode, we don't need real DB connection for reads
    if (this.isPreviewMode()) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Bump version to 4 to force complete rebuild with monthly tables
      const request = indexedDB.open("SellMoreDB", 4);

      request.onerror = () => {
        reject(new Error("Failed to open database"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ Database initialized successfully (version 4)");
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        console.log(`📦 Database upgrade: v${oldVersion} → v${event.newVersion}`);

        // Create settings store
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
          console.log("  ✅ Created: settings");
        }

        // Create items store
        if (!db.objectStoreNames.contains("items")) {
          const itemStore = db.createObjectStore("items", {
            keyPath: "id",
            autoIncrement: true,
          });
          itemStore.createIndex("sku", "sku", { unique: false });
          itemStore.createIndex("barcode", "barcode", { unique: false });
          itemStore.createIndex("active", "active", { unique: false });
          console.log("  ✅ Created: items");
        }

        // Create employees store
        if (!db.objectStoreNames.contains("employees")) {
          const empStore = db.createObjectStore("employees", {
            keyPath: "id",
            autoIncrement: true,
          });
          empStore.createIndex("pin", "pin", { unique: false });
          console.log("  ✅ Created: employees");
        }

        // Create transactions store
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", {
            keyPath: "id",
            autoIncrement: true,
          });
          txStore.createIndex("businessDate", "businessDate", { unique: false });
          txStore.createIndex("shiftId", "shiftId", { unique: false });
          txStore.createIndex("cashierId", "cashierId", { unique: false });
          console.log("  ✅ Created: transactions");
        }

        // Create shifts store
        if (!db.objectStoreNames.contains("shifts")) {
          const shiftStore = db.createObjectStore("shifts", {
            keyPath: "id",
            autoIncrement: true,
          });
          shiftStore.createIndex("businessDate", "businessDate", { unique: false });
          shiftStore.createIndex("cashierId", "cashierId", { unique: false });
          console.log("  ✅ Created: shifts");
        }

        // Create attendance store
        if (!db.objectStoreNames.contains("attendance")) {
          const attStore = db.createObjectStore("attendance", {
            keyPath: "id",
            autoIncrement: true,
          });
          attStore.createIndex("employeeId", "employeeId", { unique: false });
          attStore.createIndex("businessDate", "businessDate", { unique: false });
          attStore.createIndex("date", "date", { unique: false });
          console.log("  ✅ Created: attendance");
        }

        // Create session management stores
        if (!db.objectStoreNames.contains("cashierSession")) {
          db.createObjectStore("cashierSession", { keyPath: "id" });
          console.log("  ✅ Created: cashierSession");
        }
        if (!db.objectStoreNames.contains("pauseState")) {
          db.createObjectStore("pauseState", { keyPath: "id" });
          console.log("  ✅ Created: pauseState");
        }

        // Version 2+: Create daily summary stores
        if (!db.objectStoreNames.contains("dailyItemSales")) {
          const dailyItemStore = db.createObjectStore("dailyItemSales", {
            keyPath: "id",
            autoIncrement: true,
          });
          dailyItemStore.createIndex("businessDate", "businessDate", { unique: false });
          dailyItemStore.createIndex("itemId", "itemId", { unique: false });
          dailyItemStore.createIndex(
            "businessDate_itemId",
            ["businessDate", "itemId"],
            { unique: false }
          );
          console.log("  ✅ Created: dailyItemSales");
        }

        if (!db.objectStoreNames.contains("dailyPaymentSales")) {
          const dailyPaymentStore = db.createObjectStore("dailyPaymentSales", {
            keyPath: "id",
            autoIncrement: true,
          });
          dailyPaymentStore.createIndex("businessDate", "businessDate", { unique: false });
          dailyPaymentStore.createIndex("method", "method", { unique: false });
          dailyPaymentStore.createIndex(
            "businessDate_method",
            ["businessDate", "method"],
            { unique: false }
          );
          console.log("  ✅ Created: dailyPaymentSales");
        }

        if (!db.objectStoreNames.contains("dailyAttendance")) {
          const dailyAttendanceStore = db.createObjectStore("dailyAttendance", {
            keyPath: "id",
            autoIncrement: true,
          });
          dailyAttendanceStore.createIndex("businessDate", "businessDate", { unique: false });
          dailyAttendanceStore.createIndex("employeeId", "employeeId", { unique: false });
          console.log("  ✅ Created: dailyAttendance");
        }

        // Version 2+: Create monthly summary stores
        if (!db.objectStoreNames.contains("monthlyItemSales")) {
          const monthlyItemStore = db.createObjectStore("monthlyItemSales", {
            keyPath: "id",
            autoIncrement: true,
          });
          monthlyItemStore.createIndex("yearMonth", "yearMonth", { unique: false });
          monthlyItemStore.createIndex("itemId", "itemId", { unique: false });
          monthlyItemStore.createIndex(
            "yearMonth_itemId",
            ["yearMonth", "itemId"],
            { unique: false }
          );
          console.log("  ✅ Created: monthlyItemSales");
        }

        if (!db.objectStoreNames.contains("monthlyPaymentSales")) {
          const monthlyPaymentStore = db.createObjectStore("monthlyPaymentSales", {
            keyPath: "id",
            autoIncrement: true,
          });
          monthlyPaymentStore.createIndex("yearMonth", "yearMonth", { unique: false });
          monthlyPaymentStore.createIndex("method", "method", { unique: false });
          monthlyPaymentStore.createIndex(
            "yearMonth_method",
            ["yearMonth", "method"],
            { unique: false }
          );
          console.log("  ✅ Created: monthlyPaymentSales");
        }

        if (!db.objectStoreNames.contains("monthlySalesSummary")) {
          const monthlySummaryStore = db.createObjectStore("monthlySalesSummary", {
            keyPath: "id",
            autoIncrement: true,
          });
          monthlySummaryStore.createIndex("yearMonth", "yearMonth", { unique: false });
          console.log("  ✅ Created: monthlySalesSummary");
        }

        if (!db.objectStoreNames.contains("monthlyAttendanceSummary")) {
          const monthlyAttendanceSummaryStore = db.createObjectStore("monthlyAttendanceSummary", {
            keyPath: "id",
            autoIncrement: true,
          });
          monthlyAttendanceSummaryStore.createIndex("yearMonth", "yearMonth", { unique: false });
          console.log("  ✅ Created: monthlyAttendanceSummary");
        }

        // Version 3+: Add testBackup store for automated UAT
        if (!db.objectStoreNames.contains("testBackup")) {
          db.createObjectStore("testBackup", { keyPath: "id" });
          console.log("  ✅ Created: testBackup");
        }

        console.log("✅ Database schema upgrade complete");
      };
    });

    return this.initPromise;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    // INTERCEPT: Preview Mode
    if (this.isPreviewMode()) {
      const data = this.getPreviewData();
      if (data) {
        if (Array.isArray(data[storeName])) {
          return data[storeName] as T[];
        }
        if (storeName === 'settings' && data.settings) {
          return [data.settings] as unknown as T[];
        }
      }
      return [];
    }

    if (!this.db) throw new Error("Database not initialized");

    // Check if store exists
    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Store '${storeName}' does not exist in database`);
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async count(storeName: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    // Check if store exists
    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Store '${storeName}' does not exist in database`);
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getById<T>(storeName: string, id: number | string): Promise<T | undefined> {
    // INTERCEPT: Preview Mode
    if (this.isPreviewMode()) {
      const list = await this.getAll<T>(storeName);
      // @ts-expect-error - id access on generic type T
      return list.find(item => item.id === id || item.key === id);
    }

    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as T | undefined);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async add<T>(storeName: string, data: Omit<T, "id"> | any): Promise<number> {
    // BLOCK: Read-only mode
    if (this.isPreviewMode()) {
      throw new Error("Cannot save data in Preview Mode");
    }

    if (!this.db) throw new Error("Database not initialized");

    // SAFETY: Check if store exists before trying to add
    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(`⚠️ Store '${storeName}' does not exist, skipping add operation`);
      return Promise.resolve(0);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    // BLOCK: Read-only mode
    if (this.isPreviewMode()) {
      throw new Error("Cannot update data in Preview Mode");
    }

    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async update<T>(storeName: string, data: T): Promise<void> {
    return this.put(storeName, data);
  }

  async delete(storeName: string, id: number): Promise<void> {
    // BLOCK: Read-only mode
    if (this.isPreviewMode()) {
      throw new Error("Cannot delete data in Preview Mode");
    }

    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async searchByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async moveToArchive(storeName: string, id: number): Promise<void> {
    const record = await this.getById<any>(storeName, id);
    if (record) {
      record.isActive = false;
      record.archivedAt = Date.now();
      await this.put(storeName, record);
    }
  }

  // OPTIMIZED: Use index lookup for daily item sales
  async upsertDailyItemSales(data: Omit<DailyItemSales, "id">): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const existing = await this.searchByIndex<DailyItemSales>(
      "dailyItemSales",
      "businessDate_itemId",
      [data.businessDate, data.itemId]
    );

    if (existing.length > 0) {
      const record = existing[0];
      const updated: DailyItemSales = {
        ...record,
        totalQuantity: record.totalQuantity + data.totalQuantity,
        totalRevenue: record.totalRevenue + data.totalRevenue,
        transactionCount: record.transactionCount + data.transactionCount,
      };
      await this.put("dailyItemSales", updated);
    } else {
      await this.add("dailyItemSales", data);
    }
  }

  // OPTIMIZED: Use index lookup for daily payment sales
  async upsertDailyPaymentSales(data: Omit<DailyPaymentSales, "id">): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const existing = await this.searchByIndex<DailyPaymentSales>(
      "dailyPaymentSales",
      "businessDate_method",
      [data.businessDate, data.method]
    );

    if (existing.length > 0) {
      const record = existing[0];
      const updated: DailyPaymentSales = {
        ...record,
        totalAmount: record.totalAmount + data.totalAmount,
        transactionCount: record.transactionCount + data.transactionCount,
      };
      await this.put("dailyPaymentSales", updated);
    } else {
      await this.add("dailyPaymentSales", data);
    }
  }

  // Generic upsert for other stores
  async upsert<T extends Record<string, any>>(
    storeName: string,
    keyFields: string[],
    data: Partial<T>
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const allRecords = await this.getAll<T>(storeName);
    const existing = allRecords.find((record: T) =>
      keyFields.every((field) => record[field] === data[field])
    );

    if (existing) {
      const updated: Record<string, any> = { ...existing };
      Object.keys(data).forEach((key) => {
        if (key === "id") return;
        const dataValue = data[key];
        const existingValue = updated[key];
        if (typeof dataValue === "number" && typeof existingValue === "number") {
          updated[key] = existingValue + dataValue;
        } else {
          updated[key] = dataValue;
        }
      });
      await this.put(storeName, updated);
    } else {
      await this.add(storeName, data);
    }
  }

  async clear(storeName: string): Promise<void> {
    // BLOCK: Read-only mode
    if (this.isPreviewMode()) {
      throw new Error("Cannot clear data in Preview Mode");
    }

    if (!this.db) throw new Error("Database not initialized");

    // SAFETY: Check if store exists
    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Store '${storeName}' does not exist, skipping clear`);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    
    const tx = this.db.transaction([
      "items",
      "employees", 
      "transactions",
      "shifts",
      "attendance",
      "dailyItemSales",
      "dailyPaymentSales",
      "dailyShiftSummary",
      "monthlyItemSales",
      "monthlySalesSummary",
      "monthlyAttendanceSummary",
      "monthlyPaymentSales",
      "cashierSession",
      "pauseState",
      "dailyAttendance"
    ], "readwrite");

    await Promise.all([
      tx.objectStore("items").clear(),
      tx.objectStore("employees").clear(),
      tx.objectStore("transactions").clear(),
      tx.objectStore("shifts").clear(),
      tx.objectStore("attendance").clear(),
      tx.objectStore("dailyItemSales").clear(),
      tx.objectStore("dailyPaymentSales").clear(),
      tx.objectStore("dailyShiftSummary").clear(),
      tx.objectStore("monthlyItemSales").clear(),
      tx.objectStore("monthlySalesSummary").clear(),
      tx.objectStore("monthlyAttendanceSummary").clear(),
      tx.objectStore("monthlyPaymentSales").clear(),
      tx.objectStore("cashierSession").clear(),
      tx.objectStore("pauseState").clear(),
      tx.objectStore("dailyAttendance").clear()
    ]);
  }

  async clearAllStores(): Promise<void> {
    return this.clearAllData();
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const settings = await this.getById<Settings>("settings", "default");
    if (!settings) {
      const defaultSettings: Settings = {
        key: "settings",
        mode: "retail",
        tax1Enabled: true,
        tax1Label: "PPN",
        tax1Rate: 10,
        tax1Inclusive: false,
        tax2Enabled: false,
        tax2Label: "Service",
        tax2Rate: 5,
        tax2Inclusive: false,
        language: "en",
        printerWidth: 58,
        businessName: "My Store",
        businessLogo: undefined,
        businessAddress: undefined,
        taxId: undefined,
        receiptFooter: "Thank you for your purchase!",
        googleDriveLinked: false,
        googleAccountEmail: undefined,
        allowPriceOverride: false,
        shifts: {
          shift1: { enabled: true, name: "Morning Shift", startTime: "09:00", endTime: "18:00" },
          shift2: { enabled: false, name: "Afternoon Shift", startTime: "14:00", endTime: "22:00" },
          shift3: { enabled: false, name: "Night Shift", startTime: "22:00", endTime: "06:00" },
        },
        paymentMethods: {
          cash: true,
          card: true,
          ewallet: true,
          qr: true,
          transfer: true
        }
      };
      await this.put("settings", defaultSettings);
      return defaultSettings;
    }
    return settings;
  }

  async updateSettings(settings: Settings): Promise<void> {
    await this.put("settings", settings);
  }

  // Items
  async getItems(): Promise<Item[]> {
    return this.getAll<Item>("items");
  }

  async getItemById(id: number): Promise<Item | undefined> {
    return this.getById<Item>("items", id);
  }

  async addItem(item: Omit<Item, "id">): Promise<number> {
    return this.add<Item>("items", item);
  }

  async updateItem(item: Item): Promise<void> {
    if (!item.id) throw new Error("Item must have an id to update");
    await this.put("items", item);
  }

  async deleteItem(id: number): Promise<void> {
    await this.delete("items", id);
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return this.getAll<Employee>("employees");
  }

  async getEmployeeById(id: number): Promise<Employee | undefined> {
    return this.getById<Employee>("employees", id);
  }

  async addEmployee(employee: Omit<Employee, "id">): Promise<number> {
    return this.add<Employee>("employees", employee);
  }

  async updateEmployee(employee: Employee): Promise<void> {
    if (!employee.id) throw new Error("Employee must have an id to update");
    await this.put("employees", employee);
  }

  async deleteEmployee(id: number): Promise<void> {
    await this.delete("employees", id);
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return this.getAll<Transaction>("transactions");
  }

  async addTransaction(transaction: Omit<Transaction, "id">): Promise<number> {
    return this.add<Transaction>("transactions", transaction);
  }

  // Shifts
  async getShifts(): Promise<Shift[]> {
    return this.getAll<Shift>("shifts");
  }

  async addShift(shift: Omit<Shift, "id">): Promise<number> {
    return this.add<Shift>("shifts", shift);
  }

  async updateShift(shift: Shift): Promise<void> {
    if (!shift.id) throw new Error("Shift must have an id to update");
    await this.put("shifts", shift);
  }

  // Attendance
  async getAttendance(): Promise<Attendance[]> {
    return this.getAll<Attendance>("attendance");
  }

  async addAttendance(attendance: Omit<Attendance, "id">): Promise<number> {
    return this.add<Attendance>("attendance", attendance);
  }

  async updateAttendance(attendance: Attendance): Promise<void> {
    if (!attendance.id) throw new Error("Attendance must have an id to update");
    await this.put("attendance", attendance);
  }

  // Daily Item Sales
  async getDailyItemSales(): Promise<DailyItemSales[]> {
    return this.getAll<DailyItemSales>("dailyItemSales");
  }

  // Daily Payment Sales
  async getDailyPaymentSales(): Promise<DailyPaymentSales[]> {
    return this.getAll<DailyPaymentSales>("dailyPaymentSales");
  }

  // Monthly Item Sales
  async getMonthlyItemSales(): Promise<MonthlyItemSales[]> {
    return this.getAll<MonthlyItemSales>("monthlyItemSales");
  }

  // Monthly Payment Sales
  async getMonthlyPaymentSales(): Promise<MonthlyPaymentSales[]> {
    return this.getAll<MonthlyPaymentSales>("monthlyPaymentSales");
  }

  async upsertMonthlyPaymentSales(data: MonthlyPaymentSales): Promise<void> {
    await this.upsert<MonthlyPaymentSales>("monthlyPaymentSales", ["month", "paymentMethod"], data);
  }

  async upsertMonthlySalesSummary(summary: MonthlySalesSummary): Promise<void> {
    await this.upsert<MonthlySalesSummary>("monthlySalesSummary", ["month"], summary);
  }

  // Clear methods for database management
  async clearTransactions(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["transactions"], "readwrite");
      const store = tx.objectStore("transactions");
      const request = store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearDailySummaries(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["dailyItemSales", "dailyPaymentSales"], "readwrite");
      tx.objectStore("dailyItemSales").clear();
      tx.objectStore("dailyPaymentSales").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearMonthlySummaries(): Promise<void> {
    const tx = this.db!.transaction(["monthlyItemSales", "monthlySalesSummary", "monthlyAttendanceSummary", "monthlyPaymentSales"], "readwrite");
    await Promise.all([
      tx.objectStore("monthlyItemSales").clear(),
      tx.objectStore("monthlySalesSummary").clear(),
      tx.objectStore("monthlyAttendanceSummary").clear(),
      tx.objectStore("monthlyPaymentSales").clear()
    ]);
  }

  async clearAttendance(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["attendance", "dailyAttendance"], "readwrite");
      tx.objectStore("attendance").clear();
      if (this.db!.objectStoreNames.contains("dailyAttendance")) {
        tx.objectStore("dailyAttendance").clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const db = new Database();

/**
 * Export all data for backup
 */
export async function getAllData() {
  await db.init();
  const storeNames = [
    "settings", 
    "items", 
    "employees", 
    "transactions", 
    "shifts", 
    "attendance", 
    "dailyItemSales", 
    "dailyPaymentSales", 
    "monthlyItemSales", 
    "monthlyPaymentSales"
  ];
  
  const backup: Record<string, any[]> = {};
  
  for (const store of storeNames) {
    try {
      backup[store] = await db.getAll(store);
    } catch (e) {
      console.warn(`Skipping store ${store} in backup:`, e);
      backup[store] = [];
    }
  }
  
  return backup;
}

/**
 * Import data from backup
 * CRITICAL: This overwrites existing data!
 */
export async function importData(backupData: Record<string, any[]>) {
  await db.init();
  
  const validStores = [
    "settings", 
    "items", 
    "employees", 
    "transactions", 
    "shifts", 
    "attendance", 
    "dailyItemSales", 
    "dailyPaymentSales", 
    "monthlyItemSales", 
    "monthlyPaymentSales"
  ];

  for (const storeName of validStores) {
    if (backupData[storeName] && Array.isArray(backupData[storeName])) {
      try {
        await db.clear(storeName);
        
        for (const item of backupData[storeName]) {
          await db.put(storeName, item);
        }
      } catch (e) {
        console.error(`Failed to restore store ${storeName}:`, e);
        throw new Error(`Failed to restore ${storeName} data`);
      }
    }
  }
}