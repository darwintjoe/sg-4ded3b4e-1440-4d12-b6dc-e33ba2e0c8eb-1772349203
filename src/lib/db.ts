// src/lib/db.ts - IndexedDB wrapper with proper transaction handling

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
  taxRate: number;
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
      const request = indexedDB.open("SellMoreDB", 2);

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
              { unique: true }
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
              { unique: true }
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
              { unique: true }
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
              { unique: true }
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

  async getById<T>(storeName: string, id: number): Promise<T | undefined> {
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

  async add<T>(storeName: string, data: Omit<T, "id">): Promise<number> {
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

  async upsert<T extends Record<string, any>>(
    storeName: string,
    keyFields: string[],
    data: Partial<T>
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      // Get all records in one read operation
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const allRecords = getAllRequest.result as T[];
        const existing = allRecords.find((record: T) =>
          keyFields.every((field) => record[field] === data[field])
        );

        if (existing) {
          // Update existing record (merge numeric fields, replace others)
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

          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          // Insert new record
          const addRequest = store.add(data);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    });
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
        taxRate: 10,
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