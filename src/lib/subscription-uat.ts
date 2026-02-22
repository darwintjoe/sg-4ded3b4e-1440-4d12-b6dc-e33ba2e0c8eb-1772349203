/**
 * Subscription UAT (User Acceptance Testing)
 * Tests subscription status, grace period, and backup blocking functionality
 */

import { backupService, BackupStatus } from "./backup-service";

export interface UATResult {
  pass: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface UATSuite {
  name: string;
  description: string;
  tests: UATTest[];
}

export interface UATTest {
  id: string;
  name: string;
  description: string;
  run: () => Promise<UATResult>;
}

// Test configuration
interface TestConfig {
  businessId: string;
  activeSubscription?: {
    expiresAt: string;
  };
  expiredSubscription?: {
    expiresAt: string;
  };
  gracePeriodSubscription?: {
    expiresAt: string;
  };
}

/**
 * Main Subscription UAT Class
 */
export class SubscriptionUAT {
  private results: Map<string, UATResult> = new Map();
  private testConfig: TestConfig;
  private originalLocalStorage: Record<string, string | null> = {};
  private originalDate: typeof Date;

  constructor(config: TestConfig) {
    this.testConfig = config;
    this.originalDate = Date;
  }

  /**
   * Run all subscription tests
   */
  async runAllTests(): Promise<Map<string, UATResult>> {
    console.log("🧪 Starting Subscription UAT Tests...\n");

    // Save original localStorage state
    this.saveLocalStorageState();

    try {
      // Run each test suite
      await this.runSuite(this.getSubscriptionStatusTests());
      await this.runSuite(this.getBackupBlockingTests());
      await this.runSuite(this.getGracePeriodTests());
      await this.runSuite(this.getMultiBusinessTests());
      await this.runSuite(this.getEdgeCaseTests());

    } finally {
      // Restore original state
      this.restoreLocalStorageState();
    }

    this.printSummary();
    return this.results;
  }

  /**
   * Run a test suite
   */
  private async runSuite(suite: UATSuite): Promise<void> {
    console.log(`\n📋 ${suite.name}`);
    console.log(`   ${suite.description}\n`);

    for (const test of suite.tests) {
      const result = await test.run();
      this.results.set(test.id, result);

      const icon = result.pass ? "✅" : "❌";
      console.log(`   ${icon} ${test.name}`);
      if (!result.pass) {
        console.log(`      ${result.message}`);
        if (result.details) {
          console.log(`      Details:`, result.details);
        }
      }
    }
  }

  /**
   * Save current localStorage state
   */
  private saveLocalStorageState(): void {
    if (typeof window === "undefined") return;

    const keys = [
      "subscription",
      `subscription_${this.testConfig.businessId}`,
      "last_backup_time",
      `last_backup_time_${this.testConfig.businessId}`,
      "device_id",
      "google_tokens",
    ];

    for (const key of keys) {
      this.originalLocalStorage[key] = localStorage.getItem(key);
    }
  }

  /**
   * Restore original localStorage state
   */
  private restoreLocalStorageState(): void {
    if (typeof window === "undefined") return;

    for (const [key, value] of Object.entries(this.originalLocalStorage)) {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    }
  }

  /**
   * Subscription Status Detection Tests
   */
  private getSubscriptionStatusTests(): UATSuite {
    return {
      name: "Subscription Status Detection",
      description: "Verify subscription status is correctly detected",
      tests: [
        {
          id: "SUB-001",
          name: "Detect active subscription",
          description: "Should detect active subscription when expiresAt is in future",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: future.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.active && !status.gracePeriod && !status.expired,
              message: status.active
                ? "Subscription correctly detected as active"
                : `Expected active, got: ${JSON.stringify(status)}`,
              details: status,
            };
          },
        },
        {
          id: "SUB-002",
          name: "Detect expired subscription",
          description: "Should detect expired subscription when expiresAt + 30 days < now",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const past = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: past.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: !status.active && !status.gracePeriod && status.expired,
              message: status.expired
                ? "Subscription correctly detected as expired"
                : `Expected expired, got: ${JSON.stringify(status)}`,
              details: status,
            };
          },
        },
        {
          id: "SUB-003",
          name: "Detect grace period",
          description: "Should detect grace period when expired but within 30 days",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const recently = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: recently.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: !status.active && status.gracePeriod && !status.expired,
              message: status.gracePeriod
                ? "Grace period correctly detected"
                : `Expected grace period, got: ${JSON.stringify(status)}`,
              details: status,
            };
          },
        },
        {
          id: "SUB-004",
          name: "Handle missing subscription data",
          description: "Should treat missing subscription as active (legacy support)",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            localStorage.removeItem(`subscription_${this.testConfig.businessId}`);

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.active && !status.gracePeriod && !status.expired,
              message: status.active
                ? "Missing subscription correctly treated as active (legacy support)"
                : `Expected active for missing data, got: ${JSON.stringify(status)}`,
              details: status,
            };
          },
        },
      ],
    };
  }

  /**
   * Backup Blocking Tests
   */
  private getBackupBlockingTests(): UATSuite {
    return {
      name: "Backup Functionality Blocking",
      description: "Verify backup is blocked based on subscription status",
      tests: [
        {
          id: "BLK-001",
          name: "Allow backup with active subscription",
          description: "Backup should be allowed when subscription is active",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: future.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const shouldBackup = backupService.shouldBackup(this.testConfig.businessId);

            return {
              pass: shouldBackup.allowed && !shouldBackup.reason,
              message: shouldBackup.allowed
                ? "Backup correctly allowed for active subscription"
                : `Expected allowed, got: ${JSON.stringify(shouldBackup)}`,
              details: shouldBackup,
            };
          },
        },
        {
          id: "BLK-002",
          name: "Block backup with expired subscription",
          description: "Backup should be blocked when subscription expired past grace period",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const past = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: past.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const shouldBackup = backupService.shouldBackup(this.testConfig.businessId);

            return {
              pass: !shouldBackup.allowed && shouldBackup.reason === "subscription_expired",
              message: !shouldBackup.allowed
                ? "Backup correctly blocked for expired subscription"
                : `Expected blocked, got: ${JSON.stringify(shouldBackup)}`,
              details: shouldBackup,
            };
          },
        },
        {
          id: "BLK-003",
          name: "Allow backup during grace period with reason",
          description: "Backup should be allowed during grace period with grace_period reason",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const recently = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: recently.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const shouldBackup = backupService.shouldBackup(this.testConfig.businessId);

            return {
              pass: shouldBackup.allowed && shouldBackup.reason === "grace_period",
              message: shouldBackup.allowed && shouldBackup.reason === "grace_period"
                ? "Backup correctly allowed during grace period with reason"
                : `Expected allowed with grace_period reason, got: ${JSON.stringify(shouldBackup)}`,
              details: shouldBackup,
            };
          },
        },
        {
          id: "BLK-004",
          name: "Backup status includes subscriptionBlocked",
          description: "getBackupStatus should include subscriptionBlocked flag",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const past = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: past.toISOString() })
            );

            const status = await backupService.getBackupStatus(this.testConfig.businessId);

            return {
              pass: status.subscriptionBlocked === true,
              message: status.subscriptionBlocked
                ? "Backup status correctly shows subscriptionBlocked: true"
                : `Expected subscriptionBlocked: true, got: ${status.subscriptionBlocked}`,
              details: { subscriptionBlocked: status.subscriptionBlocked },
            };
          },
        },
      ],
    };
  }

  /**
   * Grace Period Tests
   */
  private getGracePeriodTests(): UATSuite {
    return {
      name: "Grace Period Functionality",
      description: "Verify 30-day grace period works correctly",
      tests: [
        {
          id: "GRACE-001",
          name: "Grace period exact boundary - day 1",
          description: "Should be in grace period on day 1 after expiry",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: oneDayAgo.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.gracePeriod === true,
              message: status.gracePeriod
                ? "Day 1 correctly in grace period"
                : `Expected grace period on day 1, got: ${JSON.stringify(status)}`,
              details: { daysSinceExpiry: 1, status },
            };
          },
        },
        {
          id: "GRACE-002",
          name: "Grace period exact boundary - day 30",
          description: "Should be in grace period on day 30 after expiry",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: thirtyDaysAgo.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.gracePeriod === true,
              message: status.gracePeriod
                ? "Day 30 correctly in grace period"
                : `Expected grace period on day 30, got: ${JSON.stringify(status)}`,
              details: { daysSinceExpiry: 30, status },
            };
          },
        },
        {
          id: "GRACE-003",
          name: "Grace period ends after day 30",
          description: "Should be fully expired on day 31",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: thirtyOneDaysAgo.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.expired === true && status.gracePeriod === false,
              message: status.expired && !status.gracePeriod
                ? "Day 31 correctly shows expired (grace period ended)"
                : `Expected expired on day 31, got: ${JSON.stringify(status)}`,
              details: { daysSinceExpiry: 31, status },
            };
          },
        },
        {
          id: "GRACE-004",
          name: "Expiry timestamp preserved in status",
          description: "Original expiry timestamp should be preserved",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const expiry = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: expiry.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.expiresAt === expiry.toISOString(),
              message: status.expiresAt === expiry.toISOString()
                ? "Expiry timestamp correctly preserved"
                : `Expected ${expiry.toISOString()}, got ${status.expiresAt}`,
              details: { expected: expiry.toISOString(), actual: status.expiresAt },
            };
          },
        },
      ],
    };
  }

  /**
   * Multi-Business Tests
   */
  private getMultiBusinessTests(): UATSuite {
    const secondBusinessId = "second-business-123";

    return {
      name: "Multi-Business Subscription Support",
      description: "Verify subscription is scoped per business",
      tests: [
        {
          id: "MULTI-001",
          name: "Separate subscription status per business",
          description: "Each business should have independent subscription status",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            // Set primary business as active
            const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: future.toISOString() })
            );

            // Set second business as expired
            const past = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${secondBusinessId}`,
              JSON.stringify({ expiresAt: past.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const primaryStatus = backupService.getSubscriptionStatus(this.testConfig.businessId);
            // @ts-ignore - accessing private method for testing
            const secondStatus = backupService.getSubscriptionStatus(secondBusinessId);

            const correct = primaryStatus.active && !primaryStatus.expired &&
                          !secondStatus.active && secondStatus.expired;

            return {
              pass: correct,
              message: correct
                ? "Businesses correctly have independent subscription status"
                : "Primary should be active, second should be expired",
              details: { primary: primaryStatus, second: secondStatus },
            };
          },
        },
        {
          id: "MULTI-002",
          name: "Backup allowed for active, blocked for expired",
          description: "Backup should respect per-business subscription status",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            // Primary business active
            const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: future.toISOString() })
            );

            // Second business expired
            const past = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
            localStorage.setItem(
              `subscription_${secondBusinessId}`,
              JSON.stringify({ expiresAt: past.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const primaryBackup = backupService.shouldBackup(this.testConfig.businessId);
            // @ts-ignore - accessing private method for testing
            const secondBackup = backupService.shouldBackup(secondBusinessId);

            const correct = primaryBackup.allowed && !secondBackup.allowed;

            return {
              pass: correct,
              message: correct
                ? "Backup correctly allowed for active, blocked for expired"
                : "Active business should allow backup, expired should block",
              details: { primary: primaryBackup, second: secondBackup },
            };
          },
        },
        {
          id: "MULTI-003",
          name: "Independent backup timestamps",
          description: "Each business should track backup timestamps separately",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const now = new Date().toISOString();
            localStorage.setItem(`last_backup_time_${this.testConfig.businessId}`, now);
            localStorage.setItem(`last_backup_time_${secondBusinessId}`, "2023-01-01T00:00:00.000Z");

            const primaryStatus = await backupService.getBackupStatus(this.testConfig.businessId);
            const secondStatus = await backupService.getBackupStatus(secondBusinessId);

            const correct = primaryStatus.lastBackupTime === now &&
                          secondStatus.lastBackupTime === "2023-01-01T00:00:00.000Z";

            return {
              pass: correct,
              message: correct
                ? "Backup timestamps correctly separated per business"
                : "Each business should have independent backup timestamps",
              details: {
                primaryTime: primaryStatus.lastBackupTime,
                secondTime: secondStatus.lastBackupTime,
              },
            };
          },
        },
      ],
    };
  }

  /**
   * Edge Case Tests
   */
  private getEdgeCaseTests(): UATSuite {
    return {
      name: "Edge Cases",
      description: "Handle unusual subscription scenarios",
      tests: [
        {
          id: "EDGE-001",
          name: "Handle invalid subscription JSON",
          description: "Should treat invalid JSON as active (legacy support)",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              "invalid json {{{"
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.active && !status.expired && !status.gracePeriod,
              message: status.active
                ? "Invalid JSON correctly treated as active"
                : `Expected active for invalid JSON, got: ${JSON.stringify(status)}`,
              details: status,
            };
          },
        },
        {
          id: "EDGE-002",
          name: "Handle null expiresAt",
          description: "Should treat null expiresAt as active (legacy support)",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: null })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.active && !status.expired && !status.gracePeriod,
              message: status.active
                ? "Null expiresAt correctly treated as active"
                : `Expected active for null expiresAt, got: ${JSON.stringify(status)}`,
              details: status,
            };
          },
        },
        {
          id: "EDGE-003",
          name: "Handle empty subscription object",
          description: "Should treat empty object as active (legacy support)",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({})
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: status.active && !status.expired && !status.gracePeriod,
              message: status.active
                ? "Empty object correctly treated as active"
                : `Expected active for empty object, got: ${JSON.stringify(status)}`,
              details: status,
            };
          },
        },
        {
          id: "EDGE-004",
          name: "Handle subscription expiry exactly at now",
          description: "Should treat expiry exactly at current time as grace period",
          run: async () => {
            if (typeof window === "undefined") {
              return { pass: true, message: "Skipped on server" };
            }

            const now = new Date();
            localStorage.setItem(
              `subscription_${this.testConfig.businessId}`,
              JSON.stringify({ expiresAt: now.toISOString() })
            );

            // @ts-ignore - accessing private method for testing
            const status = backupService.getSubscriptionStatus(this.testConfig.businessId);

            return {
              pass: !status.active && status.gracePeriod,
              message: status.gracePeriod
                ? "Expiry at current time correctly in grace period"
                : `Expected grace period for expiry at now, got: ${JSON.stringify(status)}`,
              details: { now: now.toISOString(), status },
            };
          },
        },
      ],
    };
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUBSCRIPTION UAT SUMMARY");
    console.log("=".repeat(60));

    const total = this.results.size;
    const passed = Array.from(this.results.values()).filter((r) => r.pass).length;
    const failed = total - passed;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results.forEach((result, id) => {
        if (!result.pass) {
          console.log(`   ${id}: ${result.message}`);
        }
      });
    }

    console.log("\n" + "=".repeat(60));
  }
}

/**
 * Run subscription UAT tests
 */
export async function runSubscriptionUAT(businessId?: string): Promise<Map<string, UATResult>> {
  const testBusinessId = businessId || `test-business-${Date.now()}`;

  const uat = new SubscriptionUAT({
    businessId: testBusinessId,
  });

  return uat.runAllTests();
}

/**
 * Export results to JSON
 */
export function exportSubscriptionUATResults(results: Map<string, UATResult>): string {
  const obj: Record<string, UATResult> = {};
  results.forEach((result, id) => {
    obj[id] = result;
  });
  return JSON.stringify(obj, null, 2);
}

/**
 * Export results to CSV
 */
export function exportSubscriptionUATCSV(results: Map<string, UATResult>): string {
  const lines = ["Test ID,Pass,Message,Details"];
  results.forEach((result, id) => {
    const details = result.details ? JSON.stringify(result.details).replace(/"/g, '""') : "";
    lines.push(`"${id}","${result.pass}","${result.message}","${details}"`);
  });
  return lines.join("\n");
}

// Export for window access
if (typeof window !== "undefined") {
  (window as any).runSubscriptionUAT = runSubscriptionUAT;
  (window as any).exportSubscriptionUATResults = exportSubscriptionUATResults;
  (window as any).exportSubscriptionUATCSV = exportSubscriptionUATCSV;
}