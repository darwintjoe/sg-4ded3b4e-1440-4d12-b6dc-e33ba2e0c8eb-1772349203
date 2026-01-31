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
} from "@/types";

export interface Settings {
  id: number;
  mode: "retail" | "cafe";
  tax1Enabled: boolean;
  tax1Label: string;
  tax1Rate: number;
  tax1Inclusive: boolean;
  tax2Enabled: boolean;
  tax2Label: string;
  tax2Rate: number;
  language: "en" | "id" | "zh";
  allowPriceOverride: boolean;
  printerWidth: "58mm" | "80mm";
  businessName: string;
  receiptFooter: string;
  googleDriveBackup: boolean;
}

class Database {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Bump version to 3 to force upgrade
      const request = indexedDB.open("SellMoreDB", 3);

      request.onerror = () => {
        reject(new Error("Failed to open database"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("items")) {
          const itemStore = db.createObjectStore("items", {
            keyPath: "id",
            autoIncrement: true,
          });
          itemStore.createIndex("sku", "sku", { unique: false });
          itemStore.createIndex("barcode", "barcode", { unique: false });
          itemStore.createIndex("active", "active", { unique: false });
        }
        if (!db.objectStoreNames.contains("employees")) {
          const empStore = db.createObjectStore("employees", {
            keyPath: "id",
            autoIncrement: true,
          });
          empStore.createIndex("pin", "pin", { unique: false });
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", {
            keyPath: "id",
            autoIncrement: true,
          });
          txStore.createIndex("businessDate", "businessDate", { unique: false });
          txStore.createIndex("shiftId", "shiftId", { unique: false });
          txStore.createIndex("cashierId", "cashierId", { unique: false });
        }
        if (!db.objectStoreNames.contains("shifts")) {
          const shiftStore = db.createObjectStore("shifts", {
            keyPath: "id",
            autoIncrement: true,
          });
          shiftStore.createIndex("businessDate", "businessDate", { unique: false });
          shiftStore.createIndex("cashierId", "cashierId", { unique: false });
        }
        if (!db.objectStoreNames.contains("attendance")) {
          const attStore = db.createObjectStore("attendance", {
            keyPath: "id",
            autoIncrement: true,
          });
          attStore.createIndex("employeeId", "employeeId", { unique: false });
          attStore.createIndex("businessDate", "businessDate", { unique: false });
          attStore.createIndex("date", "date", { unique: false });
        }

        // Add missing stores for session management
        if (!db.objectStoreNames.contains("cashierSession")) {
          db.createObjectStore("cashierSession", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("pauseState")) {
          db.createObjectStore("pauseState", { keyPath: "id" });
        }

        // Version 2: Add daily/monthly summary stores
        if (oldVersion < 2) {
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
          }

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
          }
        }
      };
    });

    return this.initPromise;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

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

  async getById<T>(storeName: string, id: number | string): Promise<T | undefined> {
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
    if (!this.db) throw new Error("Database not initialized");

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
    // For now, just mark as inactive/archived
    const record = await this.getById<any>(storeName, id);
    if (record) {
      record.isActive = false;
      record.archivedAt = Date.now();
      await this.put(storeName, record);
    }
  }

  // OPTIMIZED: Use index lookup instead of scanning entire table
  async upsertDailyItemSales(data: Omit<DailyItemSales, "id">): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Use index to find existing record quickly
    const existing = await this.searchByIndex<DailyItemSales>(
      "dailyItemSales",
      "businessDate_itemId",
      [data.businessDate, data.itemId]
    );

    if (existing.length > 0) {
      // Update existing (accumulate)
      const record = existing[0];
      const updated: DailyItemSales = {
        ...record,
        totalQuantity: record.totalQuantity + data.totalQuantity,
        totalRevenue: record.totalRevenue + data.totalRevenue,
        transactionCount: record.transactionCount + data.transactionCount,
      };
      await this.put("dailyItemSales", updated);
    } else {
      // Insert new
      await this.add("dailyItemSales", data);
    }
  }

  // OPTIMIZED: Use index lookup instead of scanning entire table
  async upsertDailyPaymentSales(data: Omit<DailyPaymentSales, "id">): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Use index to find existing record quickly
    const existing = await this.searchByIndex<DailyPaymentSales>(
      "dailyPaymentSales",
      "businessDate_method",
      [data.businessDate, data.method]
    );

    if (existing.length > 0) {
      // Update existing (accumulate)
      const record = existing[0];
      const updated: DailyPaymentSales = {
        ...record,
        totalAmount: record.totalAmount + data.totalAmount,
        transactionCount: record.transactionCount + data.transactionCount,
      };
      await this.put("dailyPaymentSales", updated);
    } else {
      // Insert new
      await this.add("dailyPaymentSales", data);
    }
  }

  // Generic upsert for other stores (kept for compatibility)
  async upsert<T extends Record<string, any>>(
    storeName: string,
    keyFields: string[],
    data: Partial<T>
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Read all records first (separate transaction)
    const allRecords = await this.getAll<T>(storeName);
    const existing = allRecords.find((record: T) =>
      keyFields.every((field) => record[field] === data[field])
    );

    // Now do the write in a fresh transaction
    if (existing) {
      // Update existing record (merge numeric fields)
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
      // Insert new record
      await this.add(storeName, data);
    }
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

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

  // Settings
  async getSettings(): Promise<Settings> {
    const settings = await this.getById<Settings>("settings", 1);
    if (!settings) {
      const defaultSettings: Settings = {
        id: 1,
        mode: "retail",
        tax1Enabled: true,
        tax1Label: "PPN",
        tax1Rate: 10,
        tax1Inclusive: false,
        tax2Enabled: false,
        tax2Label: "GST",
        tax2Rate: 5,
        language: "en",
        allowPriceOverride: true,
        printerWidth: "58mm",
        businessName: "Sell More",
        receiptFooter: "Thank you for your purchase!",
        googleDriveBackup: false,
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
}

export const db = new Database();