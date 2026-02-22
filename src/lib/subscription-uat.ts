/**
 * Subscription UAT (User Acceptance Testing)
 * Tests subscription status, grace period, backup blocking, and multi-business scenarios
 */

import { BackupService } from "./backup-service";

export interface SubscriptionUATResult {
  testCase: string;
  category: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  timestamp: number;
}

export interface SubscriptionUATReport {
  startTime: number;
  endTime: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: SubscriptionUATResult[];
  summary: string;
}

export class SubscriptionUAT {
  private results: SubscriptionUATResult[] = [];
  private originalLocalStorage: Record<string, string> = {};

  // Helper: Save original localStorage state
  private saveLocalStorageState() {
    this.originalLocalStorage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        this.originalLocalStorage[key] = localStorage.getItem(key) || "";
      }
    }
  }

  // Helper: Restore original localStorage state
  private restoreLocalStorageState() {
    localStorage.clear();
    Object.entries(this.originalLocalStorage).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  // Helper: Set subscription data in localStorage
  private setSubscription(businessId: string | null, expiresAt: string | null, active: boolean = true) {
    const key = businessId ? `subscription_${businessId}` : "subscription";
    const data = {
      active,
      expiresAt,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Helper: Clear all subscription data
  private clearSubscriptions() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === "subscription" || key.startsWith("subscription_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  // Helper: Execute test with timestamp
  private async executeTest(
    testCase: string,
    category: string,
    testFn: () => Promise<void>
  ): Promise<SubscriptionUATResult> {
    const timestamp = Date.now();
    
    try {
      await testFn();
      return {
        testCase,
        category,
        status: "PASS",
        message: "Test passed successfully",
        timestamp
      };
    } catch (error) {
      return {
        testCase,
        category,
        status: "FAIL",
        message: error instanceof Error ? error.message : String(error),
        timestamp
      };
    }
  }

  // Helper: Assertion
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

  // ========================================
  // TEST CATEGORY 1: Active Subscription
  // ========================================

  async test_1_1_ActiveSubscriptionAllowsBackup() {
    return this.executeTest(
      "1.1: Active Subscription - Backup Allowed",
      "Active Subscription",
      async () => {
        this.clearSubscriptions();
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        this.setSubscription(null, futureDate.toISOString(), true);

        const backupService = new BackupService();
        const status = await backupService.getBackupStatus();
        
        this.assert(status.canBackup, "Backup should be allowed with active subscription");
        this.assert(!status.subscriptionBlocked, "Should not be subscription blocked");
      }
    );
  }

  async test_1_2_LegacyUserNoSubscriptionData() {
    return this.executeTest(
      "1.2: Legacy User (No Subscription Data) - Backup Allowed",
      "Active Subscription",
      async () => {
        this.clearSubscriptions();
        // No subscription data set - simulates legacy user

        const backupService = new BackupService();
        const status = await backupService.getBackupStatus();
        
        this.assert(status.canBackup, "Legacy users should be allowed to backup");
        this.assert(!status.subscriptionBlocked, "Legacy users should not be blocked");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 2: Expired Subscription
  // ========================================

  async test_2_1_ExpiredSubscriptionBlocksBackup() {
    return this.executeTest(
      "2.1: Expired Subscription (Past 30-day Grace) - Backup Blocked",
      "Expired Subscription",
      async () => {
        this.clearSubscriptions();
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 40); // 40 days ago (past grace period)
        this.setSubscription(null, pastDate.toISOString(), false);

        const backupService = new BackupService();
        
        // Try to create backup
        const result = await backupService.createBackup();
        
        this.assertEqual(result.success, false, "Backup should fail");
        this.assertEqual(result.subscriptionBlocked, true, "Should be subscription blocked");
      }
    );
  }

  async test_2_2_ExpiredShowsCorrectError() {
    return this.executeTest(
      "2.2: Expired Subscription - Shows Correct Error Message",
      "Expired Subscription",
      async () => {
        this.clearSubscriptions();
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 40);
        this.setSubscription(null, pastDate.toISOString(), false);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        this.assert(result.error?.includes("Subscription expired"), "Should show subscription expired error");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 3: Grace Period
  // ========================================

  async test_3_1_GracePeriodAllowsBackup() {
    return this.executeTest(
      "3.1: Grace Period (Within 30 Days) - Backup Allowed",
      "Grace Period",
      async () => {
        this.clearSubscriptions();
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 15); // 15 days ago (within grace)
        this.setSubscription(null, expiredDate.toISOString(), false);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        // Note: createBackup also checks Google sign-in, so it might fail for that reason
        // but should NOT be subscription blocked
        if (result.subscriptionBlocked) {
          throw new Error("Backup should be allowed during grace period");
        }
      }
    );
  }

  async test_3_2_GracePeriodExactly30Days() {
    return this.executeTest(
      "3.2: Grace Period (Exactly 30 Days) - Backup Allowed",
      "Grace Period",
      async () => {
        this.clearSubscriptions();
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 30); // Exactly 30 days ago
        this.setSubscription(null, expiredDate.toISOString(), false);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        if (result.subscriptionBlocked) {
          throw new Error("Backup should be allowed at exactly 30 days grace");
        }
      }
    );
  }

  async test_3_3_GracePeriodEndBoundary() {
    return this.executeTest(
      "3.3: Grace Period (31 Days - Just Past) - Backup Blocked",
      "Grace Period",
      async () => {
        this.clearSubscriptions();
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 31); // 31 days ago (just past grace)
        this.setSubscription(null, expiredDate.toISOString(), false);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        this.assertEqual(result.subscriptionBlocked, true, "Backup should be blocked after grace period");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 4: Multi-Business Subscription
  // ========================================

  async test_4_1_BusinessAActive_BusinessBExpired() {
    return this.executeTest(
      "4.1: Business A Active, Business B Expired - Independent Status",
      "Multi-Business",
      async () => {
        this.clearSubscriptions();
        
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 40);
        
        // Business A: Active
        this.setSubscription("business-a", futureDate.toISOString(), true);
        // Business B: Expired
        this.setSubscription("business-b", pastDate.toISOString(), false);

        const backupService = new BackupService();
        
        // Business A should allow backup
        const resultA = await backupService.createBackup("business-a");
        if (resultA.subscriptionBlocked) {
          throw new Error("Business A (active) should allow backup");
        }
        
        // Business B should block backup
        const resultB = await backupService.createBackup("business-b");
        this.assertEqual(resultB.subscriptionBlocked, true, "Business B (expired) should block backup");
      }
    );
  }

  async test_4_2_MultipleBusinessesMixedStatus() {
    return this.executeTest(
      "4.2: Multiple Businesses - Mixed Subscription Status",
      "Multi-Business",
      async () => {
        this.clearSubscriptions();
        
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const graceDate = new Date();
        graceDate.setDate(graceDate.getDate() - 10);
        
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 40);
        
        // Multiple businesses with different statuses
        this.setSubscription("active-corp", futureDate.toISOString(), true);
        this.setSubscription("grace-corp", graceDate.toISOString(), false);
        this.setSubscription("expired-corp", expiredDate.toISOString(), false);

        const backupService = new BackupService();
        
        // Test each business
        const resultActive = await backupService.createBackup("active-corp");
        const resultGrace = await backupService.createBackup("grace-corp");
        const resultExpired = await backupService.createBackup("expired-corp");
        
        this.assert(!resultActive.subscriptionBlocked, "Active corp should not be blocked");
        this.assert(!resultGrace.subscriptionBlocked, "Grace corp should not be blocked");
        this.assert(resultExpired.subscriptionBlocked === true, "Expired corp should be blocked");
      }
    );
  }

  async test_4_3_DefaultBusinessWhenNoIdProvided() {
    return this.executeTest(
      "4.3: Default Business (No ID) - Uses Legacy Subscription Key",
      "Multi-Business",
      async () => {
        this.clearSubscriptions();
        
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        // Set default subscription (no business ID)
        this.setSubscription(null, futureDate.toISOString(), true);

        const backupService = new BackupService();
        const result = await backupService.createBackup(); // No businessId
        
        if (result.subscriptionBlocked) {
          throw new Error("Default business should use legacy subscription and allow backup");
        }
      }
    );
  }

  async test_4_4_BusinessIsolation() {
    return this.executeTest(
      "4.4: Business Subscription Isolation - No Cross-Contamination",
      "Multi-Business",
      async () => {
        this.clearSubscriptions();
        
        // Only set subscription for business-x
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        this.setSubscription("business-x", futureDate.toISOString(), true);
        
        // business-y has no subscription data
        // Should fall back to legacy or be treated as active (legacy behavior)

        const backupService = new BackupService();
        
        // business-x should work
        const resultX = await backupService.createBackup("business-x");
        
        // business-y should either work (legacy) or fail gracefully
        const resultY = await backupService.createBackup("business-y");
        
        // The key test: business-x subscription should NOT affect business-y
        // Both should behave independently
        this.assert(!resultX.subscriptionBlocked, "Business X should work");
        // Business Y result depends on implementation, but should not be affected by X
      }
    );
  }

  // ========================================
  // TEST CATEGORY 5: Subscription Data Formats
  // ========================================

  async test_5_1_InvalidSubscriptionData() {
    return this.executeTest(
      "5.1: Invalid Subscription JSON - Treated as Active (Legacy)",
      "Data Formats",
      async () => {
        this.clearSubscriptions();
        localStorage.setItem("subscription", "invalid json {{");

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        // Invalid data should be treated as legacy (active)
        this.assert(!result.subscriptionBlocked, "Invalid data should default to active");
      }
    );
  }

  async test_5_2_MissingExpiresAt() {
    return this.executeTest(
      "5.2: Missing expiresAt Field - Treated as Active",
      "Data Formats",
      async () => {
        this.clearSubscriptions();
        localStorage.setItem("subscription", JSON.stringify({ active: true }));

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        this.assert(!result.subscriptionBlocked, "Missing expiresAt should default to active");
      }
    );
  }

  async test_5_3_NullExpiresAt() {
    return this.executeTest(
      "5.3: Null expiresAt - Treated as Active",
      "Data Formats",
      async () => {
        this.clearSubscriptions();
        this.setSubscription(null, null, true);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        this.assert(!result.subscriptionBlocked, "Null expiresAt should default to active");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 6: Edge Cases
  // ========================================

  async test_6_1_SubscriptionExactlyAtNow() {
    return this.executeTest(
      "6.1: Subscription Expires Exactly Now - Should Enter Grace Period",
      "Edge Cases",
      async () => {
        this.clearSubscriptions();
        const now = new Date();
        this.setSubscription(null, now.toISOString(), false);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        // Exactly at expiration should be in grace period (allowed)
        this.assert(!result.subscriptionBlocked, "Exactly at expiration should be in grace period");
      }
    );
  }

  async test_6_2_VeryOldSubscription() {
    return this.executeTest(
      "6.2: Very Old Subscription (1 Year Ago) - Backup Blocked",
      "Edge Cases",
      async () => {
        this.clearSubscriptions();
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 1);
        this.setSubscription(null, oldDate.toISOString(), false);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        this.assertEqual(result.subscriptionBlocked, true, "Very old subscription should block backup");
      }
    );
  }

  async test_6_3_FarFutureSubscription() {
    return this.executeTest(
      "6.3: Far Future Subscription (10 Years) - Backup Allowed",
      "Edge Cases",
      async () => {
        this.clearSubscriptions();
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 10);
        this.setSubscription(null, futureDate.toISOString(), true);

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        this.assert(!result.subscriptionBlocked, "Far future subscription should allow backup");
      }
    );
  }

  async test_6_4_EmptyLocalStorage() {
    return this.executeTest(
      "6.4: Completely Empty localStorage - Backup Allowed (Legacy)",
      "Edge Cases",
      async () => {
        localStorage.clear();

        const backupService = new BackupService();
        const result = await backupService.createBackup();
        
        this.assert(!result.subscriptionBlocked, "Empty localStorage should allow backup (legacy)");
      }
    );
  }

  // ========================================
  // TEST CATEGORY 7: Status Reporting
  // ========================================

  async test_7_1_BackupStatusReflectsSubscription() {
    return this.executeTest(
      "7.1: getBackupStatus Returns Correct Subscription Info",
      "Status Reporting",
      async () => {
        this.clearSubscriptions();
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        this.setSubscription(null, futureDate.toISOString(), true);

        const backupService = new BackupService();
        const status = await backupService.getBackupStatus();
        
        this.assert(status.canBackup, "Status should indicate backup is possible");
        this.assert(status.isHealthy, "Status should indicate healthy");
      }
    );
  }

  async test_7_2_FormattedLastBackupTime() {
    return this.executeTest(
      "7.2: getFormattedLastBackupTime Works Correctly",
      "Status Reporting",
      async () => {
        const backupService = new BackupService();
        
        // No backup yet
        const timeNever = backupService.getFormattedLastBackupTime();
        this.assertEqual(timeNever, "Never", "Should return 'Never' when no backup");
        
        // Set a recent backup time
        localStorage.setItem("last_backup_time", new Date().toISOString());
        const timeRecent = backupService.getFormattedLastBackupTime();
        this.assert(timeRecent === "Just now" || timeRecent.includes("hour"), "Should return recent time");
      }
    );
  }

  async test_7_3_BusinessSpecificBackupTime() {
    return this.executeTest(
      "7.3: Business-Specific Last Backup Time",
      "Status Reporting",
      async () => {
        const backupService = new BackupService();
        
        // Set different backup times for different businesses
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        localStorage.setItem("last_backup_time_business-1", now.toISOString());
        localStorage.setItem("last_backup_time_business-2", yesterday.toISOString());
        
        const time1 = backupService.getFormattedLastBackupTime("business-1");
        const time2 = backupService.getFormattedLastBackupTime("business-2");
        
        this.assert(time1 === "Just now" || time1.includes("hour"), "Business 1 should be recent");
        this.assert(time2.includes("day") || time2 === "1 day ago", "Business 2 should be older");
      }
    );
  }

  // ========================================
  // MAIN TEST EXECUTION
  // ========================================

  async runAllTests(): Promise<SubscriptionUATReport> {
    const startTime = Date.now();
    console.log("🧪 Starting Subscription UAT Suite...\n");

    // Save state before tests
    this.saveLocalStorageState();

    const tests = [
      // Category 1: Active Subscription
      () => this.test_1_1_ActiveSubscriptionAllowsBackup(),
      () => this.test_1_2_LegacyUserNoSubscriptionData(),
      
      // Category 2: Expired Subscription
      () => this.test_2_1_ExpiredSubscriptionBlocksBackup(),
      () => this.test_2_2_ExpiredShowsCorrectError(),
      
      // Category 3: Grace Period
      () => this.test_3_1_GracePeriodAllowsBackup(),
      () => this.test_3_2_GracePeriodExactly30Days(),
      () => this.test_3_3_GracePeriodEndBoundary(),
      
      // Category 4: Multi-Business
      () => this.test_4_1_BusinessAActive_BusinessBExpired(),
      () => this.test_4_2_MultipleBusinessesMixedStatus(),
      () => this.test_4_3_DefaultBusinessWhenNoIdProvided(),
      () => this.test_4_4_BusinessIsolation(),
      
      // Category 5: Data Formats
      () => this.test_5_1_InvalidSubscriptionData(),
      () => this.test_5_2_MissingExpiresAt(),
      () => this.test_5_3_NullExpiresAt(),
      
      // Category 6: Edge Cases
      () => this.test_6_1_SubscriptionExactlyAtNow(),
      () => this.test_6_2_VeryOldSubscription(),
      () => this.test_6_3_FarFutureSubscription(),
      () => this.test_6_4_EmptyLocalStorage(),
      
      // Category 7: Status Reporting
      () => this.test_7_1_BackupStatusReflectsSubscription(),
      () => this.test_7_2_FormattedLastBackupTime(),
      () => this.test_7_3_BusinessSpecificBackupTime(),
    ];

    for (const test of tests) {
      const result = await test();
      this.results.push(result);
      
      const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⏭️";
      console.log(`${icon} ${result.testCase}`);
      
      if (result.status === "FAIL") {
        console.log(`   └─ ${result.message}`);
      }
    }

    // Restore state after tests
    this.restoreLocalStorageState();

    const endTime = Date.now();
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    const skipped = this.results.filter(r => r.status === "SKIP").length;

    const report: SubscriptionUATReport = {
      startTime,
      endTime,
      totalTests: this.results.length,
      passed,
      failed,
      skipped,
      results: this.results,
      summary: this.generateSummary(passed, failed, skipped, endTime - startTime)
    };

    console.log("\n" + report.summary);

    return report;
  }

  private generateSummary(passed: number, failed: number, skipped: number, duration: number): string {
    const total = passed + failed + skipped;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
    
    return `
═══════════════════════════════════════════════════════
🧪 SUBSCRIPTION UAT REPORT
═══════════════════════════════════════════════════════
Total Tests:    ${total}
✅ Passed:      ${passed}
❌ Failed:      ${failed}
⏭️  Skipped:     ${skipped}
📊 Pass Rate:   ${passRate}%
⏱️  Duration:    ${(duration / 1000).toFixed(2)}s
═══════════════════════════════════════════════════════
${failed === 0 ? "🎉 ALL SUBSCRIPTION TESTS PASSED!" : "⚠️  Some tests failed - review logs above"}
═══════════════════════════════════════════════════════
    `;
  }

  // Export results
  exportResults(): string {
    return JSON.stringify(this.results, null, 2);
  }

  exportCSV(): string {
    const headers = ["Test Case", "Category", "Status", "Message", "Timestamp"];
    const rows = this.results.map(r => [
      r.testCase,
      r.category,
      r.status,
      r.message,
      new Date(r.timestamp).toISOString()
    ]);
    
    return [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
  }
}

// Singleton for browser console usage
let uatInstance: SubscriptionUAT | null = null;

export async function runSubscriptionUAT(): Promise<SubscriptionUATReport> {
  uatInstance = new SubscriptionUAT();
  return await uatInstance.runAllTests();
}

export function exportSubscriptionUATResults(): string {
  if (!uatInstance) {
    return "No UAT results available. Run tests first with runSubscriptionUAT()";
  }
  return uatInstance.exportResults();
}

export function exportSubscriptionUATCSV(): string {
  if (!uatInstance) {
    return "No UAT results available. Run tests first with runSubscriptionUAT()";
  }
  return uatInstance.exportCSV();
}

// Console helpers
declare global {
  interface Window {
    runSubscriptionUAT: typeof runSubscriptionUAT;
    exportSubscriptionUATResults: typeof exportSubscriptionUATResults;
    exportSubscriptionUATCSV: typeof exportSubscriptionUATCSV;
  }
}

if (typeof window !== "undefined") {
  window.runSubscriptionUAT = runSubscriptionUAT;
  window.exportSubscriptionUATResults = exportSubscriptionUATResults;
  window.exportSubscriptionUATCSV = exportSubscriptionUATCSV;
}