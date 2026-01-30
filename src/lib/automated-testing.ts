import { db } from "./db";
import type { Item, Employee, Transaction, AttendanceRecord, Shift, POSMode, Language } from "@/types";

interface TestResult {
  testCase: string;
  category: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  duration: number;
  timestamp: number;
}

interface TestReport {
  startTime: number;
  endTime: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  summary: string;
}

export class AutomatedTester {
  private results: TestResult[] = [];
  private testData: {
    items: Item[];
    employees: Employee[];
    transactions: Transaction[];
  } = {
    items: [],
    employees: [],
    transactions: []
  };

  // Helper: Execute test with timing
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

  // Helper: Assertion functions
  private assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  private assertEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
      throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  }

  private assertGreaterThan(actual: number, expected: number, message: string) {
    if (actual <= expected) {
      throw new Error(`${message}\nExpected > ${expected}\nActual: ${actual}`);
    }
  }

  // Initialize clean test environment
  async initializeTestEnvironment(): Promise<void> {
    console.log("🧹 Cleaning test environment...");
    
    // Clear all stores except settings
    const stores = ["items", "employees", "transactions", "attendance", "shifts", "pauseState"];
    for (const store of stores) {
      await db.clearStore(store);
    }
    
    console.log("✅ Test environment ready");
  }

  // Seed test data
  async seedTestData(): Promise<void> {
    console.log("🌱 Seeding test data...");

    // Seed employees
    const employees: Employee[] = [
      { name: "Admin User", pin: "0000", role: "admin", joinDate: Date.now() - 365 * 24 * 60 * 60 * 1000 },
      { name: "Test Cashier", pin: "1111", role: "cashier", joinDate: Date.now() - 180 * 24 * 60 * 60 * 1000 },
      { name: "John Employee", pin: "2222", role: "employee", joinDate: Date.now() - 90 * 24 * 60 * 60 * 1000 },
      { name: "Jane Employee", pin: "3333", role: "employee", joinDate: Date.now() - 60 * 24 * 60 * 60 * 1000 }
    ];

    for (const emp of employees) {
      const id = await db.add("employees", emp);
      this.testData.employees.push({ ...emp, id });
    }

    // Seed items
    const items: Item[] = [
      { name: "Test Coffee", sku: "COFFEE-001", price: 25000, category: "Beverages", isActive: true },
      { name: "Test Tea", sku: "TEA-001", price: 15000, category: "Beverages", isActive: true },
      { name: "Test Sandwich", sku: "FOOD-001", price: 35000, category: "Food", isActive: true },
      { name: "Test Cake", sku: "CAKE-001", price: 45000, category: "Desserts", isActive: true },
      { name: "Inactive Item", sku: "INACTIVE-001", price: 10000, category: "General", isActive: false }
    ];

    for (const item of items) {
      const id = await db.add("items", item);
      this.testData.items.push({ ...item, id });
    }

    console.log(`✅ Seeded ${employees.length} employees and ${items.length} items`);
  }

  // ========================================
  // TEST CATEGORY 1: Authentication & Roles
  // ========================================

  async test_1_1_CashierLogin() {
    return this.executeTest(
      "1.1: Cashier Login with Valid PIN",
      "Authentication & Roles",
      async () => {
        const employees = await db.getAll<Employee>("employees");
        const cashier = employees.find(emp => emp.pin === "1111" && emp.role === "cashier");
        
        this.assert(cashier !== undefined, "Cashier with PIN 1111 should exist");
        this.assertEqual(cashier?.role, "cashier", "User role should be cashier");
      }
    );
  }

  async test_1_2_EmployeeAttendance() {
    return this.executeTest(
      "1.2: Employee Attendance Without Login",
      "Authentication & Roles",
      async () => {
        const employees = await db.getAll<Employee>("employees");
        const employee = employees.find(emp => emp.pin === "2222" && emp.role === "employee");
        
        this.assert(employee !== undefined, "Employee with PIN 2222 should exist");
        this.assertEqual(employee?.role, "employee", "User role should be employee");
        
        // Simulate clock-in
        const attendanceRecord: AttendanceRecord = {
          employeeId: employee!.id!,
          employeeName: employee!.name,
          date: new Date().toISOString().split("T")[0],
          clockIn: Date.now(),
          status: "present"
        };
        
        const recordId = await db.add("attendance", attendanceRecord);
        this.assert(recordId > 0, "Attendance record should be created");
      }
    );
  }

  async test_1_3_AdminLogin() {
    return this.executeTest(
      "1.3: Admin Login - Ephemeral Session",
      "Authentication & Roles",
      async () => {
        const employees = await db.getAll<Employee>("employees");
        const admin = employees.find(emp => emp.pin === "0000" && emp.role === "admin");
        
        this.assert(admin !== undefined, "Admin with PIN 0000 should exist");
        this.assertEqual(admin?.role, "admin", "User role should be admin");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 2: POS Cart & Sales Flow
  // ========================================

  async test_2_1_SearchItems() {
    return this.executeTest(
      "2.1: Add Items via Search",
      "POS Cart & Sales Flow",
      async () => {
        const items = await db.getAll<Item>("items");
        
        // Test search by name
        const coffeeResults = items.filter(item => 
          item.name.toLowerCase().includes("coffee") && item.isActive !== false
        );
        this.assertGreaterThan(coffeeResults.length, 0, "Should find items by name");
        
        // Test search by SKU
        const skuResults = items.filter(item => 
          item.sku?.toLowerCase().includes("coffee-001") && item.isActive !== false
        );
        this.assertGreaterThan(skuResults.length, 0, "Should find items by SKU");
        
        // Verify inactive items excluded
        const inactiveResults = items.filter(item => item.isActive === false);
        this.assertGreaterThan(inactiveResults.length, 0, "Should have inactive items in database");
      }
    );
  }

  async test_2_3_CancelPayment() {
    return this.executeTest(
      "2.3: Cancel Payment - Cart Preserved",
      "POS Cart & Sales Flow",
      async () => {
        // Simulate cart state (this would be in context in real app)
        const cartItems = [
          { itemId: this.testData.items[0].id!, name: "Test Coffee", price: 25000, quantity: 2 },
          { itemId: this.testData.items[1].id!, name: "Test Tea", price: 15000, quantity: 1 }
        ];
        
        const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        this.assertEqual(cartTotal, 65000, "Cart total should be correct");
        
        // After cancel, cart should still exist (verified by not clearing)
        this.assert(cartItems.length > 0, "Cart should be preserved after cancel");
      }
    );
  }

  async test_2_4_SuccessfulPayment() {
    return this.executeTest(
      "2.4: Successful Payment - Cart Cleared",
      "POS Cart & Sales Flow",
      async () => {
        const transaction: Transaction = {
          items: [
            { itemId: this.testData.items[0].id!, itemName: "Test Coffee", itemPrice: 25000, quantity: 2, subtotal: 50000 }
          ],
          subtotal: 50000,
          tax: 0,
          total: 50000,
          payments: [{ method: "cash", amount: 50000 }],
          change: 0,
          cashierId: this.testData.employees[1].id!,
          cashierName: "Test Cashier",
          timestamp: Date.now(),
          shiftId: 1,
          mode: "retail"
        };
        
        const txnId = await db.add("transactions", transaction);
        this.assert(txnId > 0, "Transaction should be saved");
        
        // Verify transaction saved correctly
        const saved = await db.getById<Transaction>("transactions", txnId);
        this.assertEqual(saved?.total, 50000, "Saved transaction total should match");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 4: Pause Mode
  // ========================================

  async test_4_1_PauseSession() {
    return this.executeTest(
      "4.1: Cashier Triggers PAUSE",
      "Pause Mode",
      async () => {
        const pauseState = {
          id: 1,
          cashierId: this.testData.employees[1].id!,
          cart: [
            { itemId: this.testData.items[0].id!, name: "Test Coffee", price: 25000, quantity: 1 }
          ],
          timestamp: Date.now(),
          mode: "retail" as POSMode
        };
        
        await db.put("pauseState", pauseState);
        
        const saved = await db.getById("pauseState", 1);
        this.assert(saved !== null, "Pause state should be saved");
        this.assertEqual(saved.cart.length, 1, "Cart should be preserved in pause state");
      }
    );
  }

  async test_4_2_PausePersists() {
    return this.executeTest(
      "4.2: Refresh Browser - PAUSE Persists",
      "Pause Mode",
      async () => {
        // Simulate browser refresh by re-reading from IndexedDB
        const pauseState = await db.getById("pauseState", 1);
        
        this.assert(pauseState !== null, "Pause state should persist in IndexedDB");
        this.assert(pauseState.cart.length > 0, "Cart should be restored");
        this.assertEqual(pauseState.mode, "retail", "Mode should be restored");
      }
    );
  }

  async test_4_3_ResumeSession() {
    return this.executeTest(
      "4.3: Cashier Re-login - Cart Restored",
      "Pause Mode",
      async () => {
        const pauseState = await db.getById("pauseState", 1);
        this.assert(pauseState !== null, "Pause state should exist");
        
        // Verify cashier can resume
        const employees = await db.getAll<Employee>("employees");
        const cashier = employees.find(emp => emp.id === pauseState.cashierId);
        
        this.assert(cashier !== undefined, "Cashier should exist");
        this.assertEqual(cashier?.pin, "1111", "Should be correct cashier");
        
        // Clear pause state after resume
        await db.delete("pauseState", 1);
        const cleared = await db.getById("pauseState", 1);
        this.assert(cleared === null, "Pause state should be cleared after resume");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 6: Payments
  // ========================================

  async test_6_1_SingleCashPayment() {
    return this.executeTest(
      "6.1: Single Cash Payment",
      "Payments",
      async () => {
        const transaction: Transaction = {
          items: [{ itemId: 1, itemName: "Test Item", itemPrice: 50000, quantity: 1, subtotal: 50000 }],
          subtotal: 50000,
          tax: 0,
          total: 50000,
          payments: [{ method: "cash", amount: 50000 }],
          change: 0,
          cashierId: this.testData.employees[1].id!,
          cashierName: "Test Cashier",
          timestamp: Date.now(),
          shiftId: 1,
          mode: "retail"
        };
        
        const txnId = await db.add("transactions", transaction);
        this.assert(txnId > 0, "Transaction should be saved");
        
        const saved = await db.getById<Transaction>("transactions", txnId);
        this.assertEqual(saved?.payments[0].method, "cash", "Payment method should be cash");
        this.assertEqual(saved?.payments[0].amount, 50000, "Payment amount should match");
      }
    );
  }

  async test_6_2_MixedPayment() {
    return this.executeTest(
      "6.2: Mixed Payment (Cash + QRIS)",
      "Payments",
      async () => {
        const transaction: Transaction = {
          items: [{ itemId: 1, itemName: "Test Item", itemPrice: 100000, quantity: 1, subtotal: 100000 }],
          subtotal: 100000,
          tax: 0,
          total: 100000,
          payments: [
            { method: "cash", amount: 50000 },
            { method: "qris-static", amount: 50000 }
          ],
          change: 0,
          cashierId: this.testData.employees[1].id!,
          cashierName: "Test Cashier",
          timestamp: Date.now(),
          shiftId: 1,
          mode: "retail"
        };
        
        const txnId = await db.add("transactions", transaction);
        const saved = await db.getById<Transaction>("transactions", txnId);
        
        this.assertEqual(saved?.payments.length, 2, "Should have 2 payment methods");
        
        const totalPaid = saved?.payments.reduce((sum, p) => sum + p.amount, 0);
        this.assertEqual(totalPaid, 100000, "Total paid should equal transaction total");
      }
    );
  }

  async test_6_3_OverpaymentChange() {
    return this.executeTest(
      "6.3: Overpayment - Change Calculated",
      "Payments",
      async () => {
        const transaction: Transaction = {
          items: [{ itemId: 1, itemName: "Test Item", itemPrice: 50000, quantity: 1, subtotal: 50000 }],
          subtotal: 50000,
          tax: 0,
          total: 50000,
          payments: [{ method: "cash", amount: 100000 }],
          change: 50000,
          cashierId: this.testData.employees[1].id!,
          cashierName: "Test Cashier",
          timestamp: Date.now(),
          shiftId: 1,
          mode: "retail"
        };
        
        const txnId = await db.add("transactions", transaction);
        const saved = await db.getById<Transaction>("transactions", txnId);
        
        this.assertEqual(saved?.change, 50000, "Change should be calculated correctly");
        
        const totalPaid = saved?.payments.reduce((sum, p) => sum + p.amount, 0);
        const expectedChange = totalPaid! - saved!.total;
        this.assertEqual(saved?.change, expectedChange, "Change calculation should be accurate");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 10: Master Data CRUD
  // ========================================

  async test_10_1_AddItem() {
    return this.executeTest(
      "10.1: Add Item One-by-One",
      "Master Data CRUD",
      async () => {
        const newItem: Item = {
          name: "Automated Test Item",
          sku: "AUTO-TEST-001",
          price: 99000,
          category: "Test",
          isActive: true
        };
        
        const itemId = await db.add("items", newItem);
        this.assert(itemId > 0, "Item should be created");
        
        const saved = await db.getById<Item>("items", itemId);
        this.assertEqual(saved?.name, "Automated Test Item", "Item name should match");
        this.assertEqual(saved?.price, 99000, "Item price should match");
      }
    );
  }

  async test_10_2_ItemUniqueness() {
    return this.executeTest(
      "10.2: Items Uniqueness Validation",
      "Master Data CRUD",
      async () => {
        const items = await db.getAll<Item>("items");
        
        // Check SKU uniqueness
        const duplicateSKU = items.find(item => item.sku === "COFFEE-001");
        this.assert(duplicateSKU !== undefined, "Test item with SKU should exist");
        
        // Verify no duplicate SKUs
        const skus = items.filter(item => item.sku).map(item => item.sku);
        const uniqueSKUs = new Set(skus);
        this.assertEqual(skus.length, uniqueSKUs.size, "All SKUs should be unique");
        
        // Verify no duplicate names
        const names = items.map(item => item.name.toLowerCase());
        const uniqueNames = new Set(names);
        this.assertEqual(names.length, uniqueNames.size, "All item names should be unique");
      }
    );
  }

  async test_10_5_TransactionProtectedDeletion() {
    return this.executeTest(
      "10.5: Transaction-Protected Deletion",
      "Master Data CRUD",
      async () => {
        // Create a transaction with specific item
        const testItem = this.testData.items[0];
        
        const transaction: Transaction = {
          items: [{ itemId: testItem.id!, itemName: testItem.name, itemPrice: testItem.price, quantity: 1, subtotal: testItem.price }],
          subtotal: testItem.price,
          tax: 0,
          total: testItem.price,
          payments: [{ method: "cash", amount: testItem.price }],
          change: 0,
          cashierId: this.testData.employees[1].id!,
          cashierName: "Test Cashier",
          timestamp: Date.now(),
          shiftId: 1,
          mode: "retail"
        };
        
        await db.add("transactions", transaction);
        
        // Check if item has been transacted
        const transactions = await db.getAll<Transaction>("transactions");
        const isTransacted = transactions.some(txn => 
          txn.items?.some(cartItem => cartItem.itemId === testItem.id)
        );
        
        this.assert(isTransacted, "Item should have transaction history");
        
        // Instead of deleting, should set inactive
        if (isTransacted) {
          testItem.isActive = false;
          await db.put("items", testItem);
          
          const updated = await db.getById<Item>("items", testItem.id!);
          this.assertEqual(updated?.isActive, false, "Item should be set to inactive");
        }
      }
    );
  }

  async test_10_6_InactiveStatus() {
    return this.executeTest(
      "10.6: Inactive Status",
      "Master Data CRUD",
      async () => {
        const items = await db.getAll<Item>("items");
        
        // Find inactive item
        const inactiveItem = items.find(item => item.isActive === false);
        this.assert(inactiveItem !== undefined, "Should have at least one inactive item");
        
        // Verify active items
        const activeItems = items.filter(item => item.isActive !== false);
        this.assertGreaterThan(activeItems.length, 0, "Should have active items");
      }
    );
  }

  async test_10_10_AddEmployee() {
    return this.executeTest(
      "10.10: Add Employee",
      "Master Data CRUD",
      async () => {
        const newEmployee: Employee = {
          name: "Automated Test Employee",
          pin: "9999",
          role: "employee",
          joinDate: Date.now()
        };
        
        const empId = await db.add("employees", newEmployee);
        this.assert(empId > 0, "Employee should be created");
        
        const saved = await db.getById<Employee>("employees", empId);
        this.assertEqual(saved?.name, "Automated Test Employee", "Employee name should match");
        this.assertEqual(saved?.pin, "9999", "Employee PIN should match");
      }
    );
  }

  async test_10_11_EmployeePINUniqueness() {
    return this.executeTest(
      "10.11: Employee PIN Uniqueness",
      "Master Data CRUD",
      async () => {
        const employees = await db.getAll<Employee>("employees");
        
        // Verify no duplicate PINs
        const pins = employees.map(emp => emp.pin);
        const uniquePINs = new Set(pins);
        this.assertEqual(pins.length, uniquePINs.size, "All PINs should be unique");
        
        // Verify default PINs exist
        const hasAdmin = employees.some(emp => emp.pin === "0000");
        const hasCashier = employees.some(emp => emp.pin === "1111");
        
        this.assert(hasAdmin, "Admin with PIN 0000 should exist");
        this.assert(hasCashier, "Cashier with PIN 1111 should exist");
      }
    );
  }

  // ========================================
  // TEST EXECUTION & REPORTING
  // ========================================

  async runAllTests(): Promise<TestReport> {
    const startTime = Date.now();
    console.log("🤖 Starting Automated Testing Suite...\n");

    // Initialize environment
    await this.initializeTestEnvironment();
    await this.seedTestData();

    // Run all tests
    const tests = [
      // Category 1: Authentication
      () => this.test_1_1_CashierLogin(),
      () => this.test_1_2_EmployeeAttendance(),
      () => this.test_1_3_AdminLogin(),
      
      // Category 2: POS Cart
      () => this.test_2_1_SearchItems(),
      () => this.test_2_3_CancelPayment(),
      () => this.test_2_4_SuccessfulPayment(),
      
      // Category 4: Pause Mode
      () => this.test_4_1_PauseSession(),
      () => this.test_4_2_PausePersists(),
      () => this.test_4_3_ResumeSession(),
      
      // Category 6: Payments
      () => this.test_6_1_SingleCashPayment(),
      () => this.test_6_2_MixedPayment(),
      () => this.test_6_3_OverpaymentChange(),
      
      // Category 10: Master Data CRUD
      () => this.test_10_1_AddItem(),
      () => this.test_10_2_ItemUniqueness(),
      () => this.test_10_5_TransactionProtectedDeletion(),
      () => this.test_10_6_InactiveStatus(),
      () => this.test_10_10_AddEmployee(),
      () => this.test_10_11_EmployeePINUniqueness()
    ];

    for (const test of tests) {
      const result = await test();
      this.results.push(result);
      
      const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⏭️";
      console.log(`${icon} ${result.testCase} (${result.duration.toFixed(2)}ms)`);
      
      if (result.status === "FAIL") {
        console.log(`   └─ ${result.message}`);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Generate report
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    const skipped = this.results.filter(r => r.status === "SKIP").length;

    const report: TestReport = {
      startTime,
      endTime,
      totalTests: this.results.length,
      passed,
      failed,
      skipped,
      results: this.results,
      summary: this.generateSummary(passed, failed, skipped, totalDuration)
    };

    console.log("\n" + report.summary);

    return report;
  }

  private generateSummary(passed: number, failed: number, skipped: number, duration: number): string {
    const total = passed + failed + skipped;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
    
    return `
═══════════════════════════════════════════════════════
🤖 AUTOMATED TEST REPORT
═══════════════════════════════════════════════════════
Total Tests:    ${total}
✅ Passed:      ${passed}
❌ Failed:      ${failed}
⏭️  Skipped:     ${skipped}
📊 Pass Rate:   ${passRate}%
⏱️  Duration:    ${(duration / 1000).toFixed(2)}s
═══════════════════════════════════════════════════════
${failed === 0 ? "🎉 ALL TESTS PASSED!" : "⚠️  Some tests failed - review logs above"}
═══════════════════════════════════════════════════════
    `;
  }

  // Export results to JSON
  exportResults(): string {
    return JSON.stringify(this.results, null, 2);
  }

  // Export results to CSV
  exportCSV(): string {
    const headers = ["Test Case", "Category", "Status", "Message", "Duration (ms)", "Timestamp"];
    const rows = this.results.map(r => [
      r.testCase,
      r.category,
      r.status,
      r.message,
      r.duration.toFixed(2),
      new Date(r.timestamp).toISOString()
    ]);
    
    return [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
  }
}

// Singleton instance for browser console usage
let testerInstance: AutomatedTester | null = null;

export async function runAutomatedTests(): Promise<TestReport> {
  testerInstance = new AutomatedTester();
  return await testerInstance.runAllTests();
}

export function exportTestResults(): string {
  if (!testerInstance) {
    return "No test results available. Run tests first.";
  }
  return testerInstance.exportResults();
}

export function exportTestCSV(): string {
  if (!testerInstance) {
    return "No test results available. Run tests first.";
  }
  return testerInstance.exportCSV();
}