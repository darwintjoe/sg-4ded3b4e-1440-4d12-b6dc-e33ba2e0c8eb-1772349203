/**
 * Comprehensive App Health Check
 * Verifies critical functionality before deployment
 */

import { db } from "./db";
import { googleAuth } from "./google-auth";

interface HealthCheckResult {
  passed: boolean;
  name: string;
  duration: number;
  error?: string;
}

interface HealthReport {
  timestamp: string;
  passed: number;
  failed: number;
  total: number;
  results: HealthCheckResult[];
}

export class AppHealthChecker {
  private startTime: number = 0;

  private async runTest(
    name: string,
    testFn: () => Promise<void>
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await testFn();
      return {
        passed: true,
        name,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        passed: false,
        name,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async runHealthCheck(): Promise<HealthReport> {
    this.startTime = Date.now();
    const results: HealthCheckResult[] = [];

    console.log("🔬 Starting App Health Check...");

    // Test 1: Database Initialization
    results.push(
      await this.runTest("Database Initialization", async () => {
        await db.init();
        const settings = await db.getSettings();
        if (!settings) throw new Error("Settings not initialized");
      })
    );

    // Test 2: Settings CRUD
    results.push(
      await this.runTest("Settings Management", async () => {
        const settings = await db.getSettings();
        if (!settings) throw new Error("No settings found");
        
        // Update and verify
        const updated = { ...settings, businessName: "Test Store" };
        await db.updateSettings(updated);
        
        const verified = await db.getSettings();
        if (verified?.businessName !== "Test Store") {
          throw new Error("Settings update failed");
        }
        
        // Restore original
        await db.updateSettings(settings);
      })
    );

    // Test 3: Item CRUD
    results.push(
      await this.runTest("Item Management", async () => {
        const testItem = {
          name: "Test Item",
          price: 10000,
          category: "Test",
          isActive: true,
        };

        // Create
        const itemId = await db.addItem(testItem);

        // Read
        const items = await db.getItems();
        const found = items.find((i) => i.id === itemId);
        if (!found) throw new Error("Item creation failed");

        // Update
        const updated = { ...found, price: 15000 };
        await db.updateItem(updated);

        // Verify update
        const updatedItems = await db.getItems();
        const verified = updatedItems.find((i) => i.id === itemId);
        if (verified?.price !== 15000) throw new Error("Item update failed");

        // Delete
        await db.deleteItem(itemId);
        const afterDelete = await db.getItems();
        if (afterDelete.find((i) => i.id === itemId)) {
          throw new Error("Item deletion failed");
        }
      })
    );

    // Test 4: Employee CRUD
    results.push(
      await this.runTest("Employee Management", async () => {
        const testEmployee = {
          name: "Test Employee",
          pin: "1234",
          role: "cashier" as const,
          createdAt: Date.now(),
          isActive: true,
        };

        const empId = await db.addEmployee(testEmployee);
        const employees = await db.getEmployees();
        const found = employees.find((e) => e.id === empId);
        if (!found) throw new Error("Employee creation failed");

        await db.deleteEmployee(empId);
      })
    );

    // Test 5: Transaction Creation
    results.push(
      await this.runTest("Transaction Creation", async () => {
        const testTransaction = {
          timestamp: Date.now(),
          businessDate: new Date().toISOString().split('T')[0],
          shiftId: "test-shift",
          cashierId: 1,
          cashierName: "Test Cashier",
          mode: "retail" as const,
          items: [
            {
              itemId: 1,
              sku: "TEST001",
              name: "Test Item",
              basePrice: 10000,
              quantity: 2,
              totalPrice: 20000,
            },
          ],
          subtotal: 20000,
          tax: 0,
          total: 20000,
          payments: [
            {
              method: "cash" as const,
              amount: 20000,
            },
          ],
        };

        const txId = await db.addTransaction(testTransaction);
        if (!txId) throw new Error("Transaction creation failed");
      })
    );

    // Test 6: Google Auth Check (non-blocking)
    results.push(
      await this.runTest("Google Auth Availability", async () => {
        await googleAuth.initialize();
        // Just check it initializes without error
        // Don't require user to be signed in for health check
      })
    );

    // Test 7: localStorage Availability
    results.push(
      await this.runTest("localStorage Access", async () => {
        const testKey = "health-check-" + Date.now();
        const testValue = "test-data";
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        
        if (retrieved !== testValue) {
          throw new Error("localStorage read/write failed");
        }
        
        localStorage.removeItem(testKey);
      })
    );

    // Test 8: IndexedDB Performance
    results.push(
      await this.runTest("Database Performance", async () => {
        const start = Date.now();
        await db.getItems();
        await db.getEmployees();
        await db.getTransactions();
        const duration = Date.now() - start;

        if (duration > 2000) {
          throw new Error(`Database too slow: ${duration}ms (should be < 2000ms)`);
        }
      })
    );

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      passed,
      failed,
      total: results.length,
      results,
    };

    console.log("📊 Health Check Complete:", report);
    return report;
  }
}

// Export singleton instance
export const appHealthChecker = new AppHealthChecker();