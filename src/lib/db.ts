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
  version: 2, // Increment version for new store
  stores: [
    {
      name: "transactions",
      keyPath: "id",
      indexes: [
        { name: "timestamp", keyPath: "timestamp", unique: false },
        { name: "cashierId", keyPath: "cashierId", unique: false }
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
}

export const db = new Database();