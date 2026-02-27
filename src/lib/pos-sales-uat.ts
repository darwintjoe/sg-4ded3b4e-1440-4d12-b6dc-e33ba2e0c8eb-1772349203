// src/lib/pos-sales-uat.ts
/**
 * POS Sales UAT - Comprehensive transaction simulation and validation
 * Tests the entire sales flow from transaction creation to reporting
 */

import { db } from "./db";
import {
  Transaction,
  Item,
  DailyItemSales,
  DailyPaymentSales,
  PaymentMethod,
  CartItem,
  PaymentRecord
} from "@/types";
import { generateSampleItems } from "@/lib/sample-store-data";

interface TransactionSimulation {
  date: Date;
  items: Array<{
    item: Item;
    quantity: number;
    price: number;
  }>;
  paymentMethod: "cash" | "qris-static" | "qris-dynamic" | "split";
  cashAmount?: number;
  qrisAmount?: number;
  total: number;
}

interface SalesValidation {
  expectedRevenue: number;
  actualRevenue: number;
  expectedTransactions: number;
  actualTransactions: number;
  expectedCashTotal: number;
  actualCashTotal: number;
  expectedQrisTotal: number;
  actualQrisTotal: number;
  match: boolean;
}

interface DailyValidation {
  date: string;
  validation: SalesValidation;
  topItems: Array<{
    itemName: string;
    expectedQuantity: number;
    actualQuantity: number;
    match: boolean;
  }>;
}

export interface POSUATReport {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  simulations: {
    totalTransactions: number;
    totalItems: number;
    totalRevenue: number;
    cashTransactions: number;
    qrisTransactions: number;
    splitTransactions: number;
  };
  validations: DailyValidation[];
  errors: string[];
  summary: string;
}

export class POSSalesUAT {
  private startTime: number = 0;
  private transactions: TransactionSimulation[] = [];
  private items: Item[] = [];
  private errors: string[] = [];

  /**
   * Generate realistic transaction data for 10 days
   */
  private async generateTransactions(days: number = 10, transactionsPerDay: number = 100): Promise<void> {
    console.log(`🏪 Generating ${transactionsPerDay} transactions per day for ${days} days...`);
    
    // Load items from database
    this.items = await db.getAll<Item>("items");
    
    if (this.items.length === 0) {
      throw new Error("No items found in database. Please load sample data first.");
    }

    // Filter only active items
    const activeItems = this.items.filter(item => item.isActive);
    
    if (activeItems.length === 0) {
      throw new Error("No active items found in database.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const transactionDate = new Date(today);
      transactionDate.setDate(today.getDate() - (days - 1 - dayOffset));

      for (let txNum = 0; txNum < transactionsPerDay; txNum++) {
        // Random time during business hours (8 AM - 10 PM)
        const hour = 8 + Math.floor(Math.random() * 14);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        
        transactionDate.setHours(hour, minute, second);

        // Generate transaction
        const transaction = this.generateSingleTransaction(transactionDate, dayOffset, txNum, activeItems);
        this.transactions.push(transaction);
      }
    }

    console.log(`✅ Generated ${this.transactions.length} transactions`);
  }

  /**
   * Generate a single realistic transaction
   */
  private generateSingleTransaction(
    date: Date,
    dayOffset: number,
    txNum: number,
    activeItems: Item[]
  ): TransactionSimulation {
    // Random 5-10 items per transaction
    const itemCount = 5 + Math.floor(Math.random() * 6);
    const transactionItems: TransactionSimulation['items'] = [];
    const selectedItems = new Set<string>();

    for (let i = 0; i < itemCount; i++) {
      // Select random item (avoid duplicates)
      let item: Item;
      do {
        item = activeItems[Math.floor(Math.random() * activeItems.length)];
      } while (item.id && selectedItems.has(String(item.id)));
      
      if (item.id) {
        selectedItems.add(String(item.id));
      }

      // Random quantity 1-5
      const quantity = 1 + Math.floor(Math.random() * 5);
      
      transactionItems.push({
        item,
        quantity,
        price: item.price
      });
    }

    // Calculate total
    const subtotal = transactionItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Payment method distribution: 40% cash, 30% QRIS, 30% split
    const rand = Math.random();
    let paymentMethod: "cash" | "qris-static" | "qris-dynamic" | "split";
    let cashAmount: number | undefined;
    let qrisAmount: number | undefined;

    if (rand < 0.4) {
      // Cash only
      paymentMethod = "cash";
      cashAmount = subtotal;
    } else if (rand < 0.7) {
      // QRIS only (random between static and dynamic)
      paymentMethod = Math.random() < 0.5 ? "qris-static" : "qris-dynamic";
      qrisAmount = subtotal;
    } else {
      // Split payment (cash + QRIS)
      paymentMethod = "split";
      // Random split, but at least 20% of each
      const cashPercentage = 0.2 + Math.random() * 0.6;
      cashAmount = Math.round(subtotal * cashPercentage);
      qrisAmount = subtotal - cashAmount;
    }

    return {
      date,
      items: transactionItems,
      paymentMethod,
      cashAmount,
      qrisAmount,
      total: subtotal
    };
  }

  /**
   * Save all transactions to the database
   */
  private async saveTransactionsToDatabase(): Promise<void> {
    console.log("💾 Saving transactions to database...");
    
    let savedCount = 0;
    const batchSize = 50; // Process in batches for better performance

    for (let i = 0; i < this.transactions.length; i += batchSize) {
      const batch = this.transactions.slice(i, i + batchSize);
      
      for (const tx of batch) {
        try {
          // Construct payments array based on UAT simulation
          const payments: PaymentRecord[] = [];
          if (tx.paymentMethod === 'split') {
             if (tx.cashAmount && tx.cashAmount > 0) {
               payments.push({ method: 'cash', amount: tx.cashAmount });
             }
             if (tx.qrisAmount && tx.qrisAmount > 0) {
               payments.push({ method: 'qris-static', amount: tx.qrisAmount }); // Default to static for split in this test
             }
          } else {
             payments.push({ 
               method: tx.paymentMethod, 
               amount: tx.total 
             });
          }

          // Create transaction object matching the app's schema
          const transaction: Omit<Transaction, "id"> = {
            timestamp: tx.date.getTime(),
            businessDate: tx.date.toISOString().split('T')[0],
            shiftId: "shift-uat",
            cashierId: 999,
            cashierName: "UAT Tester",
            mode: "retail",
            items: tx.items.map(item => ({
              itemId: item.item.id!,
              sku: item.item.sku || "",
              name: item.item.name,
              basePrice: item.item.price,
              quantity: item.quantity,
              totalPrice: item.price * item.quantity
            })),
            subtotal: tx.total,
            tax1: 0,
            tax2: 0,
            tax: 0,
            total: tx.total,
            payments: payments,
            change: 0
          };

          // Save transaction
          await db.add("transactions", transaction);

          // Update daily summaries
          await this.updateDailySummaries(tx);

          savedCount++;
        } catch (error) {
          this.errors.push(`Failed to save transaction: ${error}`);
        }
      }

      // Progress update
      console.log(`Progress: ${savedCount}/${this.transactions.length} transactions saved`);
    }

    console.log(`✅ Saved ${savedCount} transactions to database`);
  }

  /**
   * Update daily summary tables
   */
  private async updateDailySummaries(tx: TransactionSimulation): Promise<void> {
    const dateKey = tx.date.toISOString().split('T')[0];

    // Update daily item sales
    for (const item of tx.items) {
      // We use upsertDailyItemSales to be consistent with db.ts optimization
      await db.upsertDailyItemSales({
        businessDate: dateKey,
        itemId: item.item.id!,
        sku: item.item.sku || "",
        itemName: item.item.name,
        totalQuantity: item.quantity,
        totalRevenue: item.price * item.quantity,
        transactionCount: 1
      });
    }

    // Update daily payment sales
    if (tx.paymentMethod === 'split') {
      if (tx.cashAmount && tx.cashAmount > 0) {
        await db.upsertDailyPaymentSales({
          businessDate: dateKey,
          method: 'cash',
          totalAmount: tx.cashAmount,
          transactionCount: 1
        });
      }
      if (tx.qrisAmount && tx.qrisAmount > 0) {
         await db.upsertDailyPaymentSales({
          businessDate: dateKey,
          method: 'qris-static', // Defaulting split QRIS to static for simplicity
          totalAmount: tx.qrisAmount,
          transactionCount: 1
        });
      }
    } else {
      await db.upsertDailyPaymentSales({
        businessDate: dateKey,
        method: tx.paymentMethod,
        totalAmount: tx.total,
        transactionCount: 1
      });
    }
  }

  /**
   * Validate daily sales data
   */
  private async validateDailySales(): Promise<DailyValidation[]> {
    console.log("🔍 Validating daily sales data...");
    
    const validations: DailyValidation[] = [];
    
    // Group transactions by date
    const transactionsByDate = new Map<string, TransactionSimulation[]>();
    
    for (const tx of this.transactions) {
      const dateKey = tx.date.toISOString().split('T')[0];
      if (!transactionsByDate.has(dateKey)) {
        transactionsByDate.set(dateKey, []);
      }
      transactionsByDate.get(dateKey)!.push(tx);
    }

    // Validate each day
    for (const [dateKey, dayTransactions] of transactionsByDate) {
      // Calculate expected values
      const expectedRevenue = dayTransactions.reduce((sum, tx) => sum + tx.total, 0);
      const expectedTransactions = dayTransactions.length;
      const expectedCashTotal = dayTransactions.reduce((sum, tx) => sum + (tx.cashAmount || 0), 0);
      const expectedQrisTotal = dayTransactions.reduce((sum, tx) => sum + (tx.qrisAmount || 0), 0);

      // Get actual values from database
      const transactions = await db.getAll<Transaction>("transactions");
      const dayReceipts = transactions.filter(r => r.businessDate === dateKey);
      const actualRevenue = dayReceipts.reduce((sum, r) => sum + r.total, 0);
      const actualTransactions = dayReceipts.length;

      const payments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      const dayPayments = payments.filter(p => p.businessDate === dateKey);
      
      const actualCashTotal = dayPayments.find(p => p.method === "cash")?.totalAmount || 0;
      const actualQrisStatic = dayPayments.find(p => p.method === "qris-static")?.totalAmount || 0;
      const actualQrisDynamic = dayPayments.find(p => p.method === "qris-dynamic")?.totalAmount || 0;
      const actualQrisTotal = actualQrisStatic + actualQrisDynamic;

      // Validate
      // Allow small float tolerance
      const revenueMatch = Math.abs(expectedRevenue - actualRevenue) < 1;
      const transactionsMatch = expectedTransactions === actualTransactions;
      const cashMatch = Math.abs(expectedCashTotal - actualCashTotal) < 1;
      const qrisMatch = Math.abs(expectedQrisTotal - actualQrisTotal) < 1;

      const validation: SalesValidation = {
        expectedRevenue,
        actualRevenue,
        expectedTransactions,
        actualTransactions,
        expectedCashTotal,
        actualCashTotal,
        expectedQrisTotal,
        actualQrisTotal,
        match: revenueMatch && transactionsMatch && cashMatch && qrisMatch
      };

      // Validate top items
      const itemQuantities = new Map<string, { name: string; quantity: number }>();
      
      for (const tx of dayTransactions) {
        for (const item of tx.items) {
          const id = String(item.item.id);
          if (!itemQuantities.has(id)) {
            itemQuantities.set(id, { name: item.item.name, quantity: 0 });
          }
          itemQuantities.get(id)!.quantity += item.quantity;
        }
      }

      const topItems: DailyValidation['topItems'] = [];
      const sortedItems = Array.from(itemQuantities.entries())
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 5);

      const dailyItemSales = await db.getAll<DailyItemSales>("dailyItemSales");

      for (const [itemId, { name, quantity: expectedQuantity }] of sortedItems) {
        const actualSale = dailyItemSales.find(s => s.businessDate === dateKey && String(s.itemId) === itemId);
        const actualQuantity = actualSale?.totalQuantity || 0;

        topItems.push({
          itemName: name,
          expectedQuantity,
          actualQuantity,
          match: expectedQuantity === actualQuantity
        });
      }

      validations.push({
        date: dateKey,
        validation,
        topItems
      });

      if (!validation.match) {
        this.errors.push(`Date ${dateKey} validation failed. Revenue: ${expectedRevenue} vs ${actualRevenue}, Cash: ${expectedCashTotal} vs ${actualCashTotal}`);
      }
    }

    return validations;
  }

  /**
   * Run all POS Sales UAT tests
   */
  async runAllTests(): Promise<POSUATReport> {
    this.startTime = Date.now();
    this.errors = [];
    this.transactions = [];

    try {
      console.log("🚀 Starting POS Sales UAT...");

      // Step 1: Clear existing data
      console.log("🧹 Clearing existing data...");
      await db.clearAllStores();

      // Step 2: Load sample items (we need items to create transactions)
      console.log("📦 Loading sample items...");
      // We import dynamically to avoid issues if file doesn't exist
      const { generateSampleStoreData } = await import("./sample-store-data");
      const sampleData = generateSampleStoreData();
      
      // Save items to database
      for (const item of sampleData.items) {
        await db.add("items", item);
      }

      // Step 3: Generate transactions
      await this.generateTransactions(10, 100);

      // Step 4: Save transactions to database
      await this.saveTransactionsToDatabase();

      // Step 5: Validate daily sales
      const validations = await this.validateDailySales();

      // Calculate simulation stats
      const cashTxCount = this.transactions.filter(tx => tx.paymentMethod === "cash").length;
      const qrisTxCount = this.transactions.filter(tx => 
        tx.paymentMethod === "qris-static" || tx.paymentMethod === "qris-dynamic"
      ).length;
      const splitTxCount = this.transactions.filter(tx => tx.paymentMethod === "split").length;
      const totalRevenue = this.transactions.reduce((sum, tx) => sum + tx.total, 0);
      const totalItems = this.transactions.reduce((sum, tx) => 
        sum + tx.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      );

      // Count passed/failed tests
      const totalTests = validations.length;
      const passed = validations.filter(v => v.validation.match).length;
      const failed = totalTests - passed;

      const duration = Date.now() - this.startTime;

      const report: POSUATReport = {
        totalTests,
        passed,
        failed,
        duration,
        simulations: {
          totalTransactions: this.transactions.length,
          totalItems,
          totalRevenue,
          cashTransactions: cashTxCount,
          qrisTransactions: qrisTxCount,
          splitTransactions: splitTxCount
        },
        validations,
        errors: this.errors,
        summary: failed === 0 
          ? `✅ All ${totalTests} daily validations passed!` 
          : `❌ ${failed} out of ${totalTests} daily validations failed`
      };

      console.log("✅ POS Sales UAT completed");
      return report;

    } catch (error) {
      console.error("❌ POS Sales UAT failed:", error);
      throw error;
    }
  }
}

/**
 * Run POS Sales UAT and return results
 */
export async function runPOSSalesUAT(): Promise<POSUATReport> {
  const uat = new POSSalesUAT();
  return await uat.runAllTests();
}