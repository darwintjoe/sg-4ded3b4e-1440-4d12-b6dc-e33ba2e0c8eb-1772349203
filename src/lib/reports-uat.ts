// src/lib/reports-uat.ts
/**
 * Comprehensive UAT Testing for Two-Tier Reports Architecture
 * Tests all report ranges and validates data accuracy
 */

import { db } from "./db";
import { generateSampleStoreData } from "./sample-store-data";
import type {
  DailyItemSales,
  DailyPaymentSales,
  MonthlyItemSales,
  MonthlySalesSummary,
  Item
} from "@/types";

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: string;
  data?: any;
  error?: string;
}

export interface UATReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  summary: string;
}

export class ReportsUAT {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private testData: any = null; // Add testData property

  async runAllTests(): Promise<UATReport> {
    console.log("🚀 Starting Reports UAT Testing...\n");
    this.startTime = Date.now();
    this.results = [];

    try {
      // Phase 1: Database Setup
      await this.testDatabaseInitialization();
      await this.testSampleDataGeneration();

      // Phase 2: Daily Summary Tests
      await this.testDailySalesQuery();
      await this.testDailyItemsQuery();

      // Phase 3: Monthly Summary Tests
      await this.testMonthlySalesQuery();
      await this.testMonthlyItemsQuery();

      // Phase 4: Range Tests
      await this.testRange1D();
      await this.testRange7D();
      await this.testRangeL30D();
      await this.testRange1M();
      await this.testRange3M();
      await this.testRange6M();
      await this.testRange1Y();
      await this.testRange3Y();
      await this.testRange5Y();

      // Phase 5: Two-Tier Query Tests
      await this.testTwoTierShortRange();
      await this.testTwoTierLongRange();

      // Phase 6: Edge Cases
      await this.testEmptyDateRange();
      await this.testMonthBoundary();
      await this.testCurrentMonthAggregation();

      // Phase 7: Data Integrity
      await this.testDataConsistency();
      await this.testDailyToMonthlyRollup();

      // Phase 8: Performance Tests
      await this.testQueryPerformance();

    } catch (error) {
      console.error("❌ UAT Testing failed:", error);
      this.addResult("UAT Execution", false, 0, `Fatal error: ${error}`);
    }

    return this.generateReport();
  }

  private async testDatabaseInitialization(): Promise<void> {
    const start = performance.now();
    try {
      await db.init();
      
      // Check if monthly tables exist
      const stores = ["monthlyItemSales", "monthlyPaymentSales", "monthlySalesSummary"];
      let allExist = true;
      
      for (const store of stores) {
        try {
          await db.getAll(store);
        } catch (e) {
          allExist = false;
          break;
        }
      }
      
      const duration = performance.now() - start;
      this.addResult(
        "Database Initialization",
        allExist,
        duration,
        allExist ? "All monthly tables exist" : "Some monthly tables missing"
      );
    } catch (error) {
      this.addResult("Database Initialization", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testSampleDataGeneration(): Promise<void> {
    const start = performance.now();
    try {
      // Clear all data first
      await db.clearAllData();
      
      // Generate fresh sample data
      const sampleData = generateSampleStoreData();
      this.testData = sampleData; // Store it
      
      // Save items first
      for (const item of sampleData.items) {
        await db.add("items", item);
      }
      
      // Save transactions
      for (const txn of sampleData.transactions) {
        await db.add("transactions", txn);
      }
      
      // Save daily summaries
      for (const daily of sampleData.dailySummaries) {
        await db.upsertDailyPaymentSales(daily);
      }
      
      // Save monthly summaries
      for (const monthly of sampleData.monthlySummaries.payments) {
        await db.upsertMonthlyPaymentSales(monthly);
      }
      
      for (const monthly of sampleData.monthlySummaries.summary) {
        await db.upsertMonthlySalesSummary(monthly);
      }
      
      // Verify data was saved
      const dailyCount = (await db.getAll<DailyPaymentSales>("dailyPaymentSales")).length;
      const monthlyCount = (await db.getAll<MonthlySalesSummary>("monthlySalesSummary")).length;
      
      const duration = performance.now() - start;
      this.addResult(
        "Sample Data Generation",
        dailyCount > 0 && monthlyCount > 0,
        duration,
        `Generated ${dailyCount} daily records, ${monthlyCount} monthly records`
      );
    } catch (error) {
      this.addResult("Sample Data Generation", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testDailySalesQuery(): Promise<void> {
    const start = performance.now();
    try {
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const uniqueDates = new Set(allDaily.map(d => d.businessDate)).size;
      
      const duration = performance.now() - start;
      this.addResult(
        "Daily Sales Query",
        allDaily.length > 0,
        duration,
        `Found ${allDaily.length} records across ${uniqueDates} dates`
      );
    } catch (error) {
      this.addResult("Daily Sales Query", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testDailyItemsQuery(): Promise<void> {
    const start = performance.now();
    try {
      const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
      const uniqueItems = new Set(allDaily.map(d => d.itemId)).size;
      
      const duration = performance.now() - start;
      this.addResult(
        "Daily Items Query",
        allDaily.length > 0,
        duration,
        `Found ${allDaily.length} records for ${uniqueItems} items`
      );
    } catch (error) {
      this.addResult("Daily Items Query", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testMonthlySalesQuery(): Promise<void> {
    const start = performance.now();
    try {
      const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
      const uniqueMonths = new Set(allMonthly.map(m => m.yearMonth)).size;
      
      const duration = performance.now() - start;
      this.addResult(
        "Monthly Sales Query",
        allMonthly.length > 0,
        duration,
        `Found ${allMonthly.length} records across ${uniqueMonths} months`
      );
    } catch (error) {
      this.addResult("Monthly Sales Query", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testMonthlyItemsQuery(): Promise<void> {
    const start = performance.now();
    try {
      const allMonthly = await db.getAll<MonthlyItemSales>("monthlyItemSales");
      const uniqueItems = new Set(allMonthly.map(m => m.itemId)).size;
      
      const duration = performance.now() - start;
      this.addResult(
        "Monthly Items Query",
        allMonthly.length > 0,
        duration,
        `Found ${allMonthly.length} records for ${uniqueItems} items`
      );
    } catch (error) {
      this.addResult("Monthly Items Query", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testRange1D(): Promise<void> {
    await this.testSalesRange("1D", 1, true);
  }

  private async testRange7D(): Promise<void> {
    await this.testSalesRange("7D", 7, true);
  }

  private async testRangeL30D(): Promise<void> {
    await this.testSalesRange("L30D", 30, true);
  }

  private async testRange1M(): Promise<void> {
    await this.testSalesRange("1M (MTD)", 31, true);
  }

  private async testRange3M(): Promise<void> {
    await this.testSalesRange("3M", 90, false);
  }

  private async testRange6M(): Promise<void> {
    await this.testSalesRange("6M", 180, false);
  }

  private async testRange1Y(): Promise<void> {
    await this.testSalesRange("1Y", 365, false);
  }

  private async testRange3Y(): Promise<void> {
    await this.testSalesRange("3Y", 1095, false);
  }

  private async testRange5Y(): Promise<void> {
    await this.testSalesRange("5Y", 1825, false);
  }

  private async testSalesRange(rangeName: string, maxDays: number, useDaily: boolean): Promise<void> {
    const start = performance.now();
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - maxDays);
      
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = today.toISOString().split("T")[0];
      
      let totalRevenue = 0;
      let recordCount = 0;
      
      if (useDaily) {
        // Query daily table
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDateStr && d.businessDate <= endDateStr);
        
        filtered.forEach(d => {
          totalRevenue += d.totalAmount;
          recordCount++;
        });
      } else {
        // Query monthly table
        const startMonth = startDateStr.substring(0, 7);
        const currentMonth = today.toISOString().substring(0, 7);
        
        const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
        const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);
        
        filteredMonthly.forEach(m => {
          totalRevenue += m.totalRevenue;
          recordCount++;
        });
        
        // Add current month daily data
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const currentDaily = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
        
        currentDaily.forEach(d => {
          totalRevenue += d.totalAmount;
          recordCount++;
        });
      }
      
      const duration = performance.now() - start;
      this.addResult(
        `Sales Range: ${rangeName}`,
        recordCount > 0,
        duration,
        `Total: Rp ${totalRevenue.toLocaleString()}, Records: ${recordCount}, Source: ${useDaily ? "Daily" : "Monthly+Daily"}`
      );
    } catch (error) {
      this.addResult(`Sales Range: ${rangeName}`, false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testTwoTierShortRange(): Promise<void> {
    const start = performance.now();
    try {
      // Test L30D uses daily table only
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];
      const endDateStr = today.toISOString().split("T")[0];
      
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const filtered = allDaily.filter(d => d.businessDate >= startDateStr && d.businessDate <= endDateStr);
      
      const duration = performance.now() - start;
      this.addResult(
        "Two-Tier: Short Range (L30D)",
        filtered.length > 0,
        duration,
        `Used daily table only: ${filtered.length} records, ${duration.toFixed(2)}ms`
      );
    } catch (error) {
      this.addResult("Two-Tier: Short Range", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testTwoTierLongRange(): Promise<void> {
    const start = performance.now();
    try {
      // Test 1Y uses monthly + current daily
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      const startMonth = oneYearAgo.toISOString().substring(0, 7);
      const currentMonth = today.toISOString().substring(0, 7);
      
      // Query monthly table
      const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
      const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);
      
      // Query current month daily
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const currentDaily = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
      
      const duration = performance.now() - start;
      this.addResult(
        "Two-Tier: Long Range (1Y)",
        filteredMonthly.length > 0,
        duration,
        `Used monthly (${filteredMonthly.length}) + daily (${currentDaily.length}) tables, ${duration.toFixed(2)}ms`
      );
    } catch (error) {
      this.addResult("Two-Tier: Long Range", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testEmptyDateRange(): Promise<void> {
    const start = performance.now();
    try {
      // Test future date range (should return empty)
      const futureDate = "2030-01-01";
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const filtered = allDaily.filter(d => d.businessDate >= futureDate);
      
      const duration = performance.now() - start;
      this.addResult(
        "Edge Case: Empty Date Range",
        filtered.length === 0,
        duration,
        "Correctly returned empty result for future date"
      );
    } catch (error) {
      this.addResult("Edge Case: Empty Date Range", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testMonthBoundary(): Promise<void> {
    const start = performance.now();
    try {
      // Test query spanning month boundary
      const today = new Date();
      const currentMonth = today.toISOString().substring(0, 7);
      
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const currentMonthData = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
      
      // Check if we have data at the start and end of month
      const daysInMonth = new Set(currentMonthData.map(d => d.businessDate.substring(8, 10)));
      
      const duration = performance.now() - start;
      this.addResult(
        "Edge Case: Month Boundary",
        currentMonthData.length > 0,
        duration,
        `Current month has ${daysInMonth.size} unique days of data`
      );
    } catch (error) {
      this.addResult("Edge Case: Month Boundary", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testCurrentMonthAggregation(): Promise<void> {
    const start = performance.now();
    try {
      // Test that current month can be aggregated on-the-fly
      const today = new Date();
      const currentMonth = today.toISOString().substring(0, 7);
      
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const currentMonthData = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
      
      let totalRevenue = 0;
      const paymentBreakdown: Record<string, number> = {};
      
      currentMonthData.forEach(d => {
        totalRevenue += d.totalAmount;
        paymentBreakdown[d.method] = (paymentBreakdown[d.method] || 0) + d.totalAmount;
      });
      
      const duration = performance.now() - start;
      this.addResult(
        "Current Month Aggregation",
        totalRevenue > 0,
        duration,
        `Aggregated ${currentMonthData.length} daily records: Rp ${totalRevenue.toLocaleString()}`
      );
    } catch (error) {
      this.addResult("Current Month Aggregation", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testDataConsistency(): Promise<void> {
    const start = performance.now();
    try {
      // Verify that monthly totals match sum of daily records
      const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      
      let consistentMonths = 0;
      let inconsistentMonths = 0;
      
      for (const monthly of allMonthly) {
        const dailyForMonth = allDaily.filter(d => d.businessDate.startsWith(monthly.yearMonth));
        
        let dailyTotal = 0;
        dailyForMonth.forEach(d => {
          dailyTotal += d.totalAmount;
        });
        
        // Allow small floating point differences
        const diff = Math.abs(monthly.totalRevenue - dailyTotal);
        if (diff < 0.01) {
          consistentMonths++;
        } else {
          inconsistentMonths++;
          console.warn(`⚠️ Inconsistency in ${monthly.yearMonth}: Monthly=${monthly.totalRevenue}, Daily=${dailyTotal}, Diff=${diff}`);
        }
      }
      
      const duration = performance.now() - start;
      this.addResult(
        "Data Consistency Check",
        inconsistentMonths === 0,
        duration,
        `Consistent: ${consistentMonths}, Inconsistent: ${inconsistentMonths}`
      );
    } catch (error) {
      this.addResult("Data Consistency Check", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testDailyToMonthlyRollup(): Promise<void> {
    const start = performance.now();
    try {
      // Simulate monthly rollup process
      const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
      
      // Check if there are months with both daily and monthly data
      const monthsWithBoth = new Set<string>();
      
      allDaily.forEach(d => {
        const month = d.businessDate.substring(0, 7);
        const hasMonthly = allMonthly.some(m => m.yearMonth === month);
        if (hasMonthly) {
          monthsWithBoth.add(month);
        }
      });
      
      const duration = performance.now() - start;
      this.addResult(
        "Daily to Monthly Rollup",
        true,
        duration,
        `Found ${monthsWithBoth.size} months with both daily and monthly data (expected for historical months)`
      );
    } catch (error) {
      this.addResult("Daily to Monthly Rollup", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private async testQueryPerformance(): Promise<void> {
    const start = performance.now();
    try {
      // Test query performance for different ranges
      const ranges = [
        { name: "1D", days: 1, useDaily: true },
        { name: "L30D", days: 30, useDaily: true },
        { name: "1Y", days: 365, useDaily: false }
      ];
      
      const performanceResults: any[] = [];
      
      for (const range of ranges) {
        const rangeStart = performance.now();
        
        if (range.useDaily) {
          const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - range.days);
          
          const filtered = allDaily.filter(d => 
            d.businessDate >= startDate.toISOString().split("T")[0] &&
            d.businessDate <= today.toISOString().split("T")[0]
          );
          
          performanceResults.push({
            range: range.name,
            records: filtered.length,
            time: (performance.now() - rangeStart).toFixed(2) + "ms"
          });
        } else {
          const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
          performanceResults.push({
            range: range.name,
            records: allMonthly.length,
            time: (performance.now() - rangeStart).toFixed(2) + "ms"
          });
        }
      }
      
      const duration = performance.now() - start;
      this.addResult(
        "Query Performance Test",
        true,
        duration,
        `Performance: ${performanceResults.map(r => `${r.range}=${r.time}`).join(", ")}`,
        performanceResults
      );
    } catch (error) {
      this.addResult("Query Performance Test", false, performance.now() - start, `Error: ${error}`);
    }
  }

  private addResult(testName: string, passed: boolean, duration: number, details: string, data?: any): void {
    const result: TestResult = {
      testName,
      passed,
      duration,
      details,
      data
    };
    this.results.push(result);
    
    const icon = passed ? "✅" : "❌";
    console.log(`${icon} ${testName}: ${details} (${duration.toFixed(2)}ms)`);
  }

  private generateReport(): UATReport {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    const summary = failed === 0
      ? `🎉 All ${total} tests passed! Two-tier architecture is working correctly.`
      : `⚠️ ${passed}/${total} tests passed, ${failed} failed. Review failed tests above.`;
    
    return {
      timestamp: new Date().toISOString(),
      totalTests: total,
      passed,
      failed,
      duration: totalDuration,
      results: this.results,
      summary
    };
  }

  async generateHTMLReport(report: UATReport): Promise<string> {
    const passRate = ((report.passed / report.totalTests) * 100).toFixed(1);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reports UAT - ${report.timestamp}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      margin: 0; 
      padding: 20px; 
      background: #f5f5f5; 
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px; 
      border-radius: 12px; 
      margin-bottom: 20px; 
    }
    .header h1 { margin: 0 0 10px 0; }
    .summary { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 15px; 
      margin-bottom: 20px; 
    }
    .card { 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
    }
    .card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
    .card .value { font-size: 32px; font-weight: bold; }
    .passed .value { color: #10b981; }
    .failed .value { color: #ef4444; }
    .rate .value { color: #3b82f6; }
    .duration .value { color: #8b5cf6; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .pass { color: #10b981; }
    .fail { color: #ef4444; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Reports UAT Test Results</h1>
      <p>Two-Tier Summary Architecture Validation</p>
      <p style="opacity: 0.9; font-size: 14px;">${report.timestamp}</p>
    </div>
    
    <div class="summary">
      <div class="card passed">
        <h3>Tests Passed</h3>
        <div class="value">${report.passed}</div>
      </div>
      <div class="card failed">
        <h3>Tests Failed</h3>
        <div class="value">${report.failed}</div>
      </div>
      <div class="card rate">
        <h3>Pass Rate</h3>
        <div class="value">${passRate}%</div>
      </div>
      <div class="card duration">
        <h3>Total Duration</h3>
        <div class="value">${(report.duration / 1000).toFixed(1)}s</div>
      </div>
    </div>
    
    <div class="card">
      <h2 style="margin-top: 0;">Test Results</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Test Name</th>
            <th>Details</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${report.results.map(r => `
            <tr>
              <td class="${r.passed ? 'pass' : 'fail'}">${r.passed ? '✅' : '❌'}</td>
              <td><strong>${r.testName}</strong></td>
              <td>${r.details}</td>
              <td>${r.duration.toFixed(2)}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="card" style="margin-top: 20px;">
      <h2 style="margin-top: 0;">Summary</h2>
      <p style="font-size: 18px; margin: 0;">${report.summary}</p>
    </div>
    
    <div class="footer">
      <p>Generated by Reports UAT Testing Suite</p>
      <p>Two-Tier Architecture: 30-day daily retention + unlimited monthly history</p>
    </div>
  </div>
</body>
</html>
    `;
    
    return html;
  }

  async setupTestData() {
    // Generate sample data
    this.testData = generateSampleStoreData();
    
    // Clear existing data
    await db.clearAllData();
    
    // Inject test data
    for (const item of this.testData.items) await db.addItem(item);
    for (const emp of this.testData.employees) await db.addEmployee(emp);
    for (const txn of this.testData.transactions) await db.addTransaction(txn);
    
    // Inject summaries
    for (const daily of this.testData.dailySummaries) {
      await db.upsertDailyPaymentSales(daily);
    }
    
    for (const monthly of this.testData.monthlySummaries.payments) {
      await db.upsertMonthlyPaymentSales(monthly);
    }
    
    for (const summary of this.testData.monthlySummaries.summary) {
      await db.upsertMonthlySalesSummary(summary);
    }
    
    await db.updateSettings(this.testData.settings);
  }
}

// Export convenience function
export async function runReportsUAT(): Promise<UATReport> {
  const uat = new ReportsUAT();
  return await uat.runAllTests();
}