/**
 * Comprehensive App Health Check
 * Verifies critical functionality before deployment
 */

import { db } from "./db";
import { googleAuth } from "./google-auth";
import type { Item, Employee, Transaction } from "@/types";

interface HealthCheckResult {
  passed: boolean;
  name: string;
  duration: number;
  error?: string;
  // properties matching TestResult in automated-testing.ts
  category?: string;
  testCase?: string;
  status?: "passed" | "failed" | "PASS" | "FAIL"; // Normalize this later
  timestamp?: number;
  message?: string;
}

interface HealthCheckReport { // Renamed from HealthReport to match error
  timestamp: number; // Changed from string to number
  passed: number;
  failed: number;
  total: number;
  results: HealthCheckResult[];
  summary: string; // Added summary
  duration: number; // Added duration
  skipped: number; // Added skipped
}

// Map HealthCheckResult to TestResult structure expected by testing page
interface TestResult {
   category: string;
   testCase: string;
   status: "PASS" | "FAIL";
   message: string;
   duration: number;
   timestamp: number;
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
        category: "Health Check",
        testCase: name,
        status: "PASS",
        timestamp: Date.now(),
        message: "Test passed"
      };
    } catch (error) {
      return {
        passed: false,
        name,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        category: "Health Check",
        testCase: name,
        status: "FAIL",
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthCheckReport> {
    const results: HealthCheckResult[] = [];
    const startTime = Date.now();

    try {
      // Test 1: Database Connection
      results.push(
        await this.runTest("Database Connection", async () => {
          await db.init();
        })
      );

      // Test 2: Settings Management
      results.push(
        await this.runTest("Settings Management", async () => {
          const settings = await db.getSettings();
          if (!settings) throw new Error("Failed to load settings");
          
          // Test update
          await db.updateSettings({ ...settings, businessName: "Test Store" });
          
          // Restore original
          await db.updateSettings(settings);
        })
      );

      // Test 3: Item Management
      results.push(
        await this.runTest("Item Management", async () => {
          const testItem: Item = {
            name: "Test Item",
            price: 10000,
            category: "Test",
            sku: "TEST123",
            isActive: true
          };

          const itemId = await db.add("items", testItem);
          if (!itemId) throw new Error("Item creation failed");

          const item = await db.getById("items", itemId);
          if (!item) throw new Error("Item retrieval failed");

          await db.delete("items", itemId);
          const deleted = await db.getById("items", itemId);
          // IndexedDB delete returns undefined or fails silently? 
          // getById returns undefined if not found.
          if (deleted) throw new Error("Item deletion failed");
        })
      );

      // Test 4: Employee Management
      results.push(
        await this.runTest("Employee Management", async () => {
          const testEmployee: Employee = {
            name: "Test Employee",
            pin: "9999",
            role: "cashier",
            createdAt: Date.now(), // Use number for timestamp
            joinDate: Date.now()
          };

          const empId = await db.add("employees", testEmployee);
          if (!empId) throw new Error("Employee creation failed");

          await db.delete("employees", empId);
        })
      );

      // Test 5: Transaction Creation
      results.push(
        await this.runTest("Transaction Creation", async () => {
          const testTransaction: Transaction = {
            items: [{ 
              itemId: 1, 
              name: "Test", 
              sku: "TEST",
              basePrice: 10000, 
              quantity: 1,
              totalPrice: 10000 
            }],
            subtotal: 10000,
            total: 10000,
            tax1: 0,
            tax2: 0,
            tax: 0,
            payments: [{ method: "cash", amount: 10000 }],
            change: 0,
            cashierId: 1,
            cashierName: "Test",
            shiftId: "shift_1",
            timestamp: Date.now(),
            mode: "retail",
            businessDate: new Date().toISOString().split('T')[0]
          };

          const txId = await db.add("transactions", testTransaction);
          if (!txId) throw new Error("Transaction creation failed");
        })
      );

      // Test 6: Attendance Tracking (Manual Implementation as clockIn might not exist on DB class)
      results.push(
        await this.runTest("Attendance Tracking", async () => {
          const attendance = {
            employeeId: 1,
            employeeName: "Test",
            clockIn: Date.now(),
            shiftName: "Morning",
            date: new Date().toISOString().split('T')[0]
          };

          const attId = await db.add("attendance", attendance);
          if (!attId) throw new Error("Clock in failed");
        })
      );

      // Test 7: Data Retrieval Performance
      results.push(
        await this.runTest("Data Retrieval Performance", async () => {
          const start = Date.now();
          await Promise.all([
            db.getAll("items"),
            db.getAll("employees"),
            db.getSettings()
          ]);
          const duration = Date.now() - start;
          
          if (duration > 1000) {
            throw new Error(`Slow data retrieval: ${duration}ms`);
          }
        })
      );

      // Test 8: IndexedDB Performance
      results.push(
        await this.runTest("Database Performance", async () => {
          const start = Date.now();
          
          // Simulate rapid operations
          for (let i = 0; i < 10; i++) {
            await db.getSettings();
          }
          
          const duration = Date.now() - start;
          if (duration > 2000) {
            throw new Error(`Database too slow: ${duration}ms (should be < 2000ms)`);
          }
        })
      );

    } catch (error) {
      results.push({
        passed: false,
        name: "System Failure",
        duration: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        category: "Critical Error",
        testCase: "System Failure",
        status: "FAIL",
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      timestamp: startTime,
      total: results.length, // Mapping totalTests to total
      passed,
      failed,
      skipped: 0,
      duration: Date.now() - startTime,
      results,
      summary: `Health Check: ${passed}/${results.length} tests passed`
    };
  }
}

// Export singleton instance
export const appHealthChecker = new AppHealthChecker();