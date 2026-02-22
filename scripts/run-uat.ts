/**
 * Execute Backup-Restore UAT Programmatically
 * Run with: npx ts-node --project tsconfig.json scripts/run-uat.ts
 */

import { BackupService } from "../src/lib/backup-service";
import { db } from "../src/lib/db";
import { AutomatedTester } from "../src/lib/automated-testing";
import type { BackupData, Transaction, Item, Employee } from "../src/types";

interface TestResult {
  testCase: string;
  category: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  duration: number;
  timestamp: number;
}

export class BackupRestoreUATRunner {
  private results: TestResult[] = [];
  private backupService: BackupService;
  private tester: AutomatedTester;

  constructor() {
    this.backupService = new BackupService();
    this.tester = new AutomatedTester();
  }

  private async executeTest(
    testCase: string,
    category: string,
    testFn: () => Promise<void>
  ): Promise<TestResult> {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      await testFn();
      const duration = performance.now() - start;
      
      return {
        testCase,
        category,
        status: "PASS",
        message: "Test passed successfully",
        duration,
        timestamp
      };
    } catch (error) {
      const duration = performance.now() - start;
      
      return {
        testCase,
        category,
        status: "FAIL",
        message: error instanceof Error ? error.message : String(error),
        duration,
        timestamp
      };
    }
  }

  async runFullSuite(): Promise<void> {
    console.log("🔄 Starting Backup-Restore UAT Suite...\n");

    // Initialize clean environment
    await this.tester.initializeTestEnvironment();
    await this.tester.seedTestData();

    // Run UAT tests
    await this.test_1_1_FreshInstallRestore();
    await this.test_1_2_CreateTransactions();
    await this.test_1_3_CheckpointReport();
    await this.test_1_4_CreateCheckpoint();
    await this.test_1_5_AdditionalTransactions();
    await this.test_1_6_FullReport();
    await this.test_1_7_RestoreCheckpoint();
    await this.test_1_8_VerifyRestoredState();
    await this.test_1_9_DataIntegrityCheck();

    this.printReport();
  }

  // 1.1: Fresh Install + Restore
  private async test_1_1_FreshInstallRestore(): Promise<void> {
    const test = await this.executeTest(
      "1.1: Fresh Install + Restore Test Data",
      "Setup",
      async () => {
        // Clear all data
        const stores = ["items", "employees", "transactions", "attendance", "shifts"];
        for (const store of stores) {
          await db.clear(store);
        }

        // Verify empty
        const items = await db.getAll<Item>("items");
        const employees = await db.getAll<Employee>("employees");
        
        if (items.length !== 0 || employees.length !== 0) {
          throw new Error("Database not cleared properly");
        }

        // Seed test data
        await this.tester.seedTestData();
        
        const restoredItems = await db.getAll<Item>("items");
        const restoredEmployees = await db.getAll<Employee>("employees");
        
        if (restoredItems.length === 0 || restoredEmployees.length === 0) {
          throw new Error("Test data not restored");
        }

        console.log("✅ Fresh install + restore completed");
      }
    );
    this.results.push(test);
  }

  // 1.2: Create 20 transactions
  private async test_1_2_CreateTransactions(): Promise<void> {
    const test = await this.executeTest(
      "1.2: Create 20 Transactions",
      "Transaction Creation",
      async () => {
        const employees = await db.getAll<Employee>("employees");
        const cashier = employees.find(e => e.role === "cashier");
        
        if (!cashier) {
          throw new Error("No cashier found");
        }

        const items = await db.getAll<Item>("items");
        const activeItems = items.filter(i => i.isActive !== false);

        // Create 20 transactions
        for (let i = 0; i < 20; i++) {
          const item = activeItems[i % activeItems.length];
          const transaction = {
            items: [{ 
              itemId: item.id!, 
              sku: item.sku || "",
              name: item.name, 
              basePrice: item.price, 
              quantity: 1, 
              totalPrice: item.price 
            }],
            subtotal: item.price,
            tax: 0,
            total: item.price,
            payments: [{ method: "cash" as const, amount: item.price }],
            change: 0,
            cashierId: cashier.id,
            cashierName: cashier.name,
            timestamp: Date.now() + i * 1000,
            shiftId: "shift1",
            mode: "retail" as const,
            businessDate: new Date().toISOString().split("T")[0]
          };

          await db.add("transactions", transaction);
        }

        const transactions = await db.getAll<Transaction>("transactions");
        if (transactions.length < 20) {
          throw new Error(`Expected 20 transactions, got ${transactions.length}`);
        }

        console.log("✅ Created 20 transactions");
      }
    );
    this.results.push(test);
  }

  // 1.3: Report Today's Sales
  private async test_1_3_CheckpointReport(): Promise<void> {
    const test = await this.executeTest(
      "1.3: Report Today's Sales (Should Show 20 Transactions)",
      "Reporting",
      async () => {
        const today = new Date().toISOString().split("T")[0];
        const transactions = await db.getAll<Transaction>("transactions");
        
        const todayTransactions = transactions.filter(t => t.businessDate === today);
        
        if (todayTransactions.length !== 20) {
          throw new Error(`Expected 20 transactions for today, got ${todayTransactions.length}`);
        }

        const revenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        console.log(`📊 Checkpoint report: ${revenue.toLocaleString()} (${todayTransactions.length} transactions)`);
      }
    );
    this.results.push(test);
  }

  // 1.4: Create Manual Backup
  private async test_1_4_CreateCheckpoint(): Promise<void> {
    const test = await this.executeTest(
      "1.4: Create Manual Backup (Checkpoint)",
      "Backup",
      async () => {
        const result = await this.backupService.createBackup();
        
        if (!result.success) {
          throw new Error(`Backup failed: ${result.error}`);
        }

        // Store backup for restore test
        const backupData = await this.backupService.exportEssentialData();
        localStorage.setItem("uat_checkpoint_backup", JSON.stringify(backupData));

        console.log("✅ Checkpoint backup created");
      }
    );
    this.results.push(test);
  }

  // 1.5: Create 30 more transactions
  private async test_1_5_AdditionalTransactions(): Promise<void> {
    const test = await this.executeTest(
      "1.5: Create 30 More Transactions",
      "Transaction Creation",
      async () => {
        const employees = await db.getAll<Employee>("employees");
        const cashier = employees.find(e => e.role === "cashier");
        
        if (!cashier) {
          throw new Error("No cashier found");
        }

        const items = await db.getAll<Item>("items");
        const activeItems = items.filter(i => i.isActive !== false);
        const beforeCount = (await db.getAll<Transaction>("transactions")).length;

        // Create 30 more transactions
        for (let i = 0; i < 30; i++) {
          const item = activeItems[i % activeItems.length];
          const transaction = {
            items: [{ 
              itemId: item.id!, 
              sku: item.sku || "",
              name: item.name, 
              basePrice: item.price, 
              quantity: 1, 
              totalPrice: item.price 
            }],
            subtotal: item.price,
            tax: 0,
            total: item.price,
            payments: [{ method: "cash" as const, amount: item.price }],
            change: 0,
            cashierId: cashier.id,
            cashierName: cashier.name,
            timestamp: Date.now() + (20000 + i * 1000),
            shiftId: "shift1",
            mode: "retail" as const,
            businessDate: new Date().toISOString().split("T")[0]
          };

          await db.add("transactions", transaction);
        }

        const afterCount = (await db.getAll<Transaction>("transactions")).length;
        
        if (afterCount !== beforeCount + 30) {
          throw new Error(`Expected ${beforeCount + 30} transactions, got ${afterCount}`);
        }

        console.log("✅ Created 30 additional transactions");
      }
    );
    this.results.push(test);
  }

  // 1.6: Full Report (50 transactions)
  private async test_1_6_FullReport(): Promise<void> {
    const test = await this.executeTest(
      "1.6: Report After 50 Total Transactions",
      "Reporting",
      async () => {
        const today = new Date().toISOString().split("T")[0];
        const transactions = await db.getAll<Transaction>("transactions");
        
        const todayTransactions = transactions.filter(t => t.businessDate === today);
        
        if (todayTransactions.length !== 50) {
          throw new Error(`Expected 50 total transactions for today, got ${todayTransactions.length}`);
        }

        const revenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        console.log(`📊 Full report: ${revenue.toLocaleString()} (${todayTransactions.length} transactions)`);
      }
    );
    this.results.push(test);
  }

  // 1.7: Restore Checkpoint
  private async test_1_7_RestoreCheckpoint(): Promise<void> {
    const test = await this.executeTest(
      "1.7: Restore from Checkpoint",
      "Restore",
      async () => {
        const backupJson = localStorage.getItem("uat_checkpoint_backup");
        if (!backupJson) {
          throw new Error("No checkpoint backup found");
        }

        const backupData: BackupData = JSON.parse(backupJson);
        
        // Store backup in service
        this.backupService.storeBackupForPreview(backupData);
        
        // Execute restore
        const result = await this.backupService.finalizeRestore();
        
        if (!result.success) {
          throw new Error(`Restore failed: ${result.error}`);
        }

        console.log("✅ Restored from checkpoint");
      }
    );
    this.results.push(test);
  }

  // 1.8: Verify Restored State
  private async test_1_8_VerifyRestoredState(): Promise<void> {
    const test = await this.executeTest(
      "1.8: Verify Restored State Shows 20 Transactions",
      "Verification",
      async () => {
        const today = new Date().toISOString().split("T")[0];
        const transactions = await db.getAll<Transaction>("transactions");
        
        const todayTransactions = transactions.filter(t => t.businessDate === today);
        
        // After restore, should have 20 transactions (checkpoint state)
        if (todayTransactions.length !== 20) {
          throw new Error(`Expected 20 transactions after restore, got ${todayTransactions.length}`);
        }

        const revenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        console.log(`📊 Restored report: ${revenue.toLocaleString()} (${todayTransactions.length} transactions)`);
      }
    );
    this.results.push(test);
  }

  // 1.9: Data Integrity Check
  private async test_1_9_DataIntegrityCheck(): Promise<void> {
    const test = await this.executeTest(
      "1.9: Data Integrity After Restore",
      "Verification",
      async () => {
        const items = await db.getAll<Item>("items");
        const employees = await db.getAll<Employee>("employees");
        const transactions = await db.getAll<Transaction>("transactions");

        // Verify basic data exists
        if (items.length === 0) {
          throw new Error("No items after restore");
        }

        if (employees.length === 0) {
          throw new Error("No employees after restore");
        }

        // Verify transaction references are valid
        for (const txn of transactions) {
          const cashier = employees.find(e => e.id === txn.cashierId);
          if (!cashier) {
            throw new Error(`Invalid cashier reference in transaction ${txn.id}`);
          }

          for (const item of txn.items) {
            const dbItem = items.find(i => i.id === item.itemId);
            if (!dbItem) {
              throw new Error(`Invalid item reference in transaction ${txn.id}`);
            }
          }
        }

        // Verify no duplicate SKUs
        const skus = items.map(i => i.sku).filter(Boolean);
        const uniqueSkus = new Set(skus);
        if (skus.length !== uniqueSkus.size) {
          throw new Error("Duplicate SKUs found");
        }

        // Verify no duplicate PINs
        const pins = employees.map(e => e.code || e.pin).filter(Boolean);
        const uniquePins = new Set(pins);
        if (pins.length !== uniquePins.size) {
          throw new Error("Duplicate PINs found");
        }

        console.log("✅ Data integrity verified");
      }
    );
    this.results.push(test);
  }

  private printReport(): void {
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    const total = this.results.length;

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🔄 BACKUP-RESTORE UAT REPORT");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log("═══════════════════════════════════════════════════════");

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter(r => r.status === "FAIL")
        .forEach(r => {
          console.log(`  • ${r.testCase}`);
          console.log(`    ${r.message}`);
        });
    }

    console.log(failed === 0 ? "\n🎉 ALL TESTS PASSED!" : "\n⚠️ Some tests failed");
    console.log("═══════════════════════════════════════════════════════\n");
  }

  exportResults(): string {
    return JSON.stringify(this.results, null, 2);
  }
}

// Run if executed directly
if (require.main === module) {
  const runner = new BackupRestoreUATRunner();
  runner.runFullSuite().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error("UAT failed:", error);
    process.exit(1);
  });
}

// Export for programmatic use
export function runBackupRestoreUAT(): Promise<string> {
  const runner = new BackupRestoreUATRunner();
  return runner.runFullSuite().then(() => runner.exportResults());
}