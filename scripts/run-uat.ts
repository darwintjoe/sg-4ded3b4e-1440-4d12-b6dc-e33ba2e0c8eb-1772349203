/**
 * Execute Backup-Restore UAT Programmatically
 * Run with: npx ts-node --project tsconfig.json scripts/run-uat.ts
 */

import { db } from "../src/lib/db";
import { backupService } from "../src/lib/backup-service";
import type { BackupData } from "../src/types";
import type { Transaction, Item, Employee } from "../src/types";

interface TestResult {
  testName: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  message?: string;
  error?: string;
}

class BackupRestoreUATRunner {
  private results: TestResult[] = [];
  private testBackupData: BackupData | null = null;
  private checkpointBackupData: BackupData | null = null;

  async runFullSuite() {
    console.log("\n🚀 ========================================");
    console.log("   BACKUP-RESTORE UAT TEST SUITE");
    console.log("========================================\n");

    const startTime = Date.now();

    await this.scenario1_FreshInstallRestore();
    await this.scenario2_ManualBackupAndTransactions();
    await this.scenario3_RestoreFromCheckpoint();

    const duration = Date.now() - startTime;
    this.printSummary(duration);
  }

  private async executeTest(
    testName: string,
    testFn: () => Promise<void>
  ): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🔍 ${testName}...`);

    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`   ✅ PASS (${duration}ms)`);
      return { testName, status: "PASS", duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ FAIL (${duration}ms): ${errorMsg}`);
      return { testName, status: "FAIL", duration, error: errorMsg };
    }
  }

  private async scenario1_FreshInstallRestore() {
    console.log("\n📋 SCENARIO 1: Fresh Install → Restore → 20 Transactions");
    console.log("─────────────────────────────────────────────────────────");

    // 1.1: Clear Database (Fresh Install)
    const test1 = await this.executeTest(
      "1.1: Clear Database (Fresh Install)",
      async () => {
        await db.clearAllData();
        console.log("   🗑️  Database cleared");
      }
    );
    this.results.push(test1);

    // 1.2: Admin Login
    const test2 = await this.executeTest(
      "1.2: Admin Login",
      async () => {
        const settings = await db.getSettings();
        if (!settings.adminPIN || settings.adminPIN !== "0000") {
          throw new Error("Admin PIN not set or incorrect");
        }
        console.log("   🔐 Admin authenticated");
      }
    );
    this.results.push(test2);

    // 1.3: Load Test Backup Data
    const test3 = await this.executeTest(
      "1.3: Load Test Backup Data",
      async () => {
        this.testBackupData = await this.generateTestBackupData();
        console.log(`   📦 Test backup created: ${this.testBackupData.items.length} items`);
      }
    );
    this.results.push(test3);

    // 1.4: Execute Restore
    const test4 = await this.executeTest(
      "1.4: Execute Restore",
      async () => {
        if (!this.testBackupData) throw new Error("No test backup data");
        
        const result = await backupService.finalizeRestore(this.testBackupData);
        if (!result.success) {
          throw new Error(result.error || "Restore failed");
        }
        console.log("   🔄 Restore completed successfully");
      }
    );
    this.results.push(test4);

    // 1.5: Cashier Login
    const test5 = await this.executeTest(
      "1.5: Cashier Login",
      async () => {
        const employees = await db.getEmployees();
        const cashier = employees.find((e: Employee) => e.role === "cashier");
        if (!cashier) throw new Error("No cashier found after restore");
        console.log(`   👤 Cashier authenticated: ${cashier.name}`);
      }
    );
    this.results.push(test5);

    // 1.6: Create 20 Test Transactions
    const test6 = await this.executeTest(
      "1.6: Create 20 Test Transactions",
      async () => {
        const items = await db.getItems();
        if (items.length === 0) throw new Error("No items found");

        const today = new Date().toISOString().split("T")[0];
        
        for (let i = 0; i < 20; i++) {
          const transaction: Omit<Transaction, "id"> = {
            businessDate: today,
            timestamp: Date.now(),
            shiftId: "shift-test",
            cashierId: 1,
            cashierName: "Test Cashier",
            mode: "retail",
            items: [{ 
              itemId: items[0].id!,
              sku: items[0].sku || "TEST-SKU",
              name: items[0].name,
              basePrice: items[0].price,
              quantity: 1,
              totalPrice: items[0].price
            }],
            subtotal: items[0].price,
            tax: 0,
            total: items[0].price,
            payments: [{ method: "cash", amount: items[0].price }],
            change: 0
          };
          
          await db.addTransaction(transaction);
        }
        console.log("   📝 20 transactions created");
      }
    );
    this.results.push(test6);

    // 1.7: Verify Today's Sales Report
    const test7 = await this.executeTest(
      "1.7: Verify Today's Sales Report",
      async () => {
        const today = new Date().toISOString().split("T")[0];
        const dailySales = await db.getDailyPaymentSales();
        
        const todaySales = dailySales.filter((s: any) => s.businessDate === today);
        const totalTransactions = todaySales.reduce((sum: number, s: any) => sum + s.transactionCount, 0);
        
        if (totalTransactions !== 20) {
          throw new Error(`Expected 20 transactions, got ${totalTransactions}`);
        }
        console.log(`   📊 Today's Sales: ${totalTransactions} transactions`);
      }
    );
    this.results.push(test7);
  }

  private async scenario2_ManualBackupAndTransactions() {
    console.log("\n📋 SCENARIO 2: Manual Backup → 30 More Transactions");
    console.log("─────────────────────────────────────────────────────────");

    // 2.1: Create Manual Backup (Checkpoint)
    const test1 = await this.executeTest(
      "2.1: Create Manual Backup (Checkpoint)",
      async () => {
        this.checkpointBackupData = await backupService.exportEssentialData();
        console.log(`   💾 Checkpoint backup created: ${this.checkpointBackupData.dailyPaymentSales.length} daily records`);
      }
    );
    this.results.push(test1);

    // 2.2: Create 30 Additional Transactions
    const test2 = await this.executeTest(
      "2.2: Create 30 Additional Transactions",
      async () => {
        const items = await db.getItems();
        const today = new Date().toISOString().split("T")[0];
        
        for (let i = 0; i < 30; i++) {
          const transaction: Omit<Transaction, "id"> = {
            businessDate: today,
            timestamp: Date.now(),
            shiftId: "shift-test",
            cashierId: 1,
            cashierName: "Test Cashier",
            mode: "retail",
            items: [{ 
              itemId: items[0].id!,
              sku: items[0].sku || "TEST-SKU",
              name: items[0].name,
              basePrice: items[0].price,
              quantity: 1,
              totalPrice: items[0].price
            }],
            subtotal: items[0].price,
            tax: 0,
            total: items[0].price,
            payments: [{ method: "cash", amount: items[0].price }],
            change: 0
          };
          
          await db.addTransaction(transaction);
        }
        console.log("   📝 30 additional transactions created");
      }
    );
    this.results.push(test2);

    // 2.3: Verify Today's Sales Report (50 Total)
    const test3 = await this.executeTest(
      "2.3: Verify Today's Sales Report (50 Total)",
      async () => {
        const today = new Date().toISOString().split("T")[0];
        const dailySales = await db.getDailyPaymentSales();
        
        const todaySales = dailySales.filter((s: any) => s.businessDate === today);
        const totalTransactions = todaySales.reduce((sum: number, s: any) => sum + s.transactionCount, 0);
        
        if (totalTransactions !== 50) {
          throw new Error(`Expected 50 transactions, got ${totalTransactions}`);
        }
        console.log(`   📊 Today's Sales: ${totalTransactions} transactions`);
      }
    );
    this.results.push(test3);
  }

  private async scenario3_RestoreFromCheckpoint() {
    console.log("\n📋 SCENARIO 3: Restore from Checkpoint → Verify 20 Transactions");
    console.log("─────────────────────────────────────────────────────────");

    // 3.1: Restore from Checkpoint Backup
    const test1 = await this.executeTest(
      "3.1: Restore from Checkpoint Backup",
      async () => {
        if (!this.checkpointBackupData) throw new Error("No checkpoint backup");
        
        const result = await backupService.finalizeRestore(this.checkpointBackupData);
        if (!result.success) {
          throw new Error(result.error || "Restore failed");
        }
        console.log("   🔄 Restored to checkpoint");
      }
    );
    this.results.push(test1);

    // 3.2: Verify Transaction Count = 20
    const test2 = await this.executeTest(
      "3.2: Verify Transaction Count = 20",
      async () => {
        const today = new Date().toISOString().split("T")[0];
        const dailySales = await db.getDailyPaymentSales();
        
        const todaySales = dailySales.filter((s: any) => s.businessDate === today);
        const totalTransactions = todaySales.reduce((sum: number, s: any) => sum + s.transactionCount, 0);
        
        if (totalTransactions !== 20) {
          throw new Error(`Expected 20 transactions after restore, got ${totalTransactions}`);
        }
        console.log(`   ✅ Transaction count correct: ${totalTransactions}`);
      }
    );
    this.results.push(test2);

    // 3.3: Verify Today's Sales Report
    const test3 = await this.executeTest(
      "3.3: Verify Today's Sales Report",
      async () => {
        const today = new Date().toISOString().split("T")[0];
        const dailySales = await db.getDailyPaymentSales();
        
        const todaySales = dailySales.filter((s: any) => s.businessDate === today);
        const totalTransactions = todaySales.reduce((sum: number, s: any) => sum + s.transactionCount, 0);
        const totalRevenue = todaySales.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
        
        console.log(`   📊 Final Report: ${totalTransactions} transactions, Revenue: ${totalRevenue}`);
      }
    );
    this.results.push(test3);
  }

  private async generateTestBackupData(): Promise<BackupData> {
    const today = new Date().toISOString().split("T")[0];
    
    return {
      metadata: {
        version: "1.0",
        timestamp: new Date().toISOString(),
        deviceId: "test-device",
        dataSize: 0,
        checksum: "test-checksum",
        status: "verified",
        itemCount: 1,
        employeeCount: 1
      },
      items: [
        {
          id: 1,
          sku: "TEST-001",
          name: "Test Product 1",
          price: 10000,
          category: "Food",
          isActive: true
        }
      ],
      employees: [
        {
          id: 1,
          name: "Test Cashier",
          pin: "1234",
          role: "cashier",
          isActive: true,
          createdAt: Date.now()
        }
      ],
      categories: [],
      shifts: [],
      dailyItemSales: [],
      dailyPaymentSales: [],
      dailyAttendance: [],
      monthlyItemSales: [],
      monthlySalesSummary: [],
      monthlyAttendanceSummary: [],
      settings: {
        key: "settings",
        mode: "retail",
        tax1Enabled: true,
        tax1Label: "PPN",
        tax1Rate: 10,
        tax1Inclusive: false,
        tax2Enabled: false,
        tax2Label: "Service",
        tax2Rate: 0,
        tax2Inclusive: false,
        language: "en",
        printerWidth: 58,
        businessName: "Test Store UAT",
        receiptFooter: "Thank you for testing!",
        googleDriveLinked: false,
        allowPriceOverride: false,
        adminPIN: "0000",
        shifts: {
          shift1: { enabled: true, name: "Morning", startTime: "08:00", endTime: "18:00" },
          shift2: { enabled: false, name: "Afternoon", startTime: "14:00", endTime: "22:00" },
          shift3: { enabled: false, name: "Evening", startTime: "20:00", endTime: "06:00" }
        },
        paymentMethods: {
          cash: true,
          card: true,
          ewallet: true,
          qr: true,
          transfer: true
        }
      }
    };
  }

  private printSummary(duration: number) {
    console.log("\n");
    console.log("========================================");
    console.log("   TEST SUMMARY");
    console.log("========================================");
    
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    const total = this.results.length;
    
    console.log(`\n📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📈 Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log("\n❌ FAILED TESTS:");
      this.results
        .filter(r => r.status === "FAIL")
        .forEach(r => {
          console.log(`   - ${r.testName}`);
          console.log(`     Error: ${r.error}`);
        });
    }
    
    console.log("\n========================================\n");
  }

  exportResults() {
    return {
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === "PASS").length,
        failed: this.results.filter(r => r.status === "FAIL").length,
        passRate: ((this.results.filter(r => r.status === "PASS").length / this.results.length) * 100).toFixed(1)
      },
      results: this.results
    };
  }
}

// Make available globally for browser execution
if (typeof window !== "undefined") {
  (window as any).runBackupRestoreUAT = async () => {
    const runner = new BackupRestoreUATRunner();
    await runner.runFullSuite();
    return runner.exportResults();
  };
}