// Local database abstraction using IndexedDB for offline-first architecture
// Optimized for low-end Android (4GB RAM / 128GB ROM)

interface DBConfig {
  name: string;
  version: number;
  stores: {
    name: string;
    keyPath: string;
    indexes?: { name: string; keyPath: string; unique: boolean }[];
  }[];
}

const DB_CONFIG: DBConfig = {
  name: "sell_more_db",
  version: 5, // Increment version for new stores
  stores: [
    {
      name: "transactions",
      keyPath: "id",
      indexes: [
        { name: "businessDate", keyPath: "businessDate", unique: false },
        { name: "timestamp", keyPath: "timestamp", unique: false },
        { name: "cashierId", keyPath: "cashierId", unique: false },
        { name: "shiftId", keyPath: "shiftId", unique: false }
      ]
    },
    {
      name: "transactionsArchive",
      keyPath: "id",
      indexes: [
        { name: "businessDate", keyPath: "businessDate", unique: false },
        { name: "timestamp", keyPath: "timestamp", unique: false }
      ]
    },
    {
      name: "shifts",
      keyPath: "id",
      indexes: [
        { name: "shiftId", keyPath: "shiftId", unique: true },
        { name: "businessDate", keyPath: "businessDate", unique: false },
        { name: "cashierId", keyPath: "cashierId", unique: false },
        { name: "status", keyPath: "status", unique: false }
      ]
    },
    {
      name: "dailyItemSales",
      keyPath: "id",
      indexes: [
        { name: "businessDate", keyPath: "businessDate", unique: false },
        { name: "itemId", keyPath: "itemId", unique: false }
      ]
    },
    {
      name: "dailyPaymentSales",
      keyPath: "id",
      indexes: [
        { name: "businessDate", keyPath: "businessDate", unique: false },
        { name: "method", keyPath: "method", unique: false }
      ]
    },
    {
      name: "dailyShiftSummary",
      keyPath: "id",
      indexes: [
        { name: "shiftId", keyPath: "shiftId", unique: true },
        { name: "businessDate", keyPath: "businessDate", unique: false },
        { name: "cashierId", keyPath: "cashierId", unique: false }
      ]
    },
    {
      name: "dailyAttendance",
      keyPath: "id",
      indexes: [
        { name: "date", keyPath: "date", unique: false },
        { name: "employeeId", keyPath: "employeeId", unique: false }
      ]
    },
    {
      name: "monthlyItemSales",
      keyPath: "id",
      indexes: [
        { name: "month", keyPath: "month", unique: false },
        { name: "itemId", keyPath: "itemId", unique: false }
      ]
    },
    {
      name: "monthlySalesSummary",
      keyPath: "id",
      indexes: [
        { name: "month", keyPath: "month", unique: true }
      ]
    },
    {
      name: "monthlyAttendanceSummary",
      keyPath: "id",
      indexes: [
        { name: "month", keyPath: "month", unique: false },
        { name: "employeeId", keyPath: "employeeId", unique: false }
      ]
    },
    {
      name: "items",
      keyPath: "id",
      indexes: [
        { name: "sku", keyPath: "sku", unique: true },
        { name: "name", keyPath: "name", unique: false },
        { name: "category", keyPath: "category", unique: false }
      ]
    },
    {
      name: "employees",
      keyPath: "id",
      indexes: [
        { name: "pin", keyPath: "pin", unique: true },
        { name: "role", keyPath: "role", unique: false }
      ]
    },
    {
      name: "attendance",
      keyPath: "id",
      indexes: [
        { name: "employeeId", keyPath: "employeeId", unique: false },
        { name: "date", keyPath: "date", unique: false },
        { name: "clockIn", keyPath: "clockIn", unique: false }
      ]
    },
    {
      name: "settings",
      keyPath: "key"
    },
    {
      name: "pauseState",
      keyPath: "id"
    },
    {
      name: "cashierSession",
      keyPath: "id"
    }
  ]
};

class Database {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        DB_CONFIG.stores.forEach((storeConfig) => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.keyPath === "id"
            });

            storeConfig.indexes?.forEach((index) => {
              store.createIndex(index.name, index.keyPath, { unique: index.unique });
            });
          }
        });
      };
    });
  }

  async add<T>(storeName: string, data: T): Promise<IDBValidKey> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: string, id: IDBValidKey): Promise<T | undefined> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: IDBValidKey): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addBatch<T>(storeName: string, records: T[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    if (records.length === 0) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      let completed = 0;
      let hasError = false;

      records.forEach((record) => {
        const request = store.add(record);
        
        request.onsuccess = () => {
          completed++;
          if (completed === records.length && !hasError) {
            resolve();
          }
        };
        
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });
    });
  }

  async upsert<T extends Record<string, any>>(
    storeName: string,
    keyFields: string[],
    data: T
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db!.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        
        // Try to find existing record by compound key
        const allRecords = await this.getAll<T>(storeName);
        const existing = allRecords.find((record) =>
          keyFields.every((field) => record[field] === data[field])
        );

        if (existing) {
          // Update existing record - merge data and increment counters
          const updated = { ...existing } as any;
          const inputData = data as any;
          
          Object.keys(inputData).forEach((key) => {
            if (key === "id") return; // Skip ID
            if (typeof inputData[key] === "number" && typeof updated[key] === "number") {
              // Sum numeric fields (quantities, revenues, counts)
              updated[key] = updated[key] + inputData[key];
            } else {
              // Overwrite non-numeric fields
              updated[key] = inputData[key];
            }
          });
          const request = store.put(updated);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } else {
          // Insert new record
          const request = store.add(data);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async moveToArchive(storeName: string, archiveStoreName: string, beforeDate: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Get records older than cutoff date
      const allRecords = await this.searchByIndex<any>(storeName, "businessDate", IDBKeyRange.upperBound(beforeDate, true));
      
      if (allRecords.length === 0) return 0;

      // Add to archive store
      await this.addBatch(archiveStoreName, allRecords);

      // Delete from hot store
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      
      await Promise.all(allRecords.map((record) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.delete(record.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }));

      return allRecords.length;
    } catch (error) {
      console.error("Error moving to archive:", error);
      return 0;
    }
  }
}

export const db = new Database();