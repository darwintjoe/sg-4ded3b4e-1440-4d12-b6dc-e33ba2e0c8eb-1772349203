// src/lib/pos-sales-uat.ts
/**
 * POS Sales UAT - Comprehensive transaction simulation and validation
 * Tests the entire sales flow from transaction creation to reporting
 */

import { db } from "./db";
import {
  Receipt,
  ReceiptItem,
  Item,
  DailyItemSales,
  DailyPaymentSales,
  PaymentMethod
} from "@/types";

interface TransactionSimulation {
  date: Date;
  receiptNumber: string;
  items: Array<{
    item: Item;
    quantity: number;
    price: number;
  }>;
  paymentMethod: PaymentMethod;
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

interface POSUATReport {
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
    this.items = await db.getAll("items");
    
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
    // Receipt number format: YYYYMMDD-XXXX
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const receiptNumber = `${dateStr}-${String(txNum + 1).padStart(4, '0')}`;

    // Random 5-10 items per transaction
    const itemCount = 5 + Math.floor(Math.random() * 6);
    const transactionItems: TransactionSimulation['items'] = [];
    const selectedItems = new Set<string>();

    for (let i = 0; i < itemCount; i++) {
      // Select random item (avoid duplicates)
      let item: Item;
      do {
        item = activeItems[Math.floor(Math.random() * activeItems.length)];
      } while (selectedItems.has(item.id));
      
      selectedItems.add(item.id);

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
    let paymentMethod: PaymentMethod;
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
      receiptNumber,
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
          // Create receipt
          const receipt: Receipt = {
            id: tx.receiptNumber,
            receiptNumber: tx.receiptNumber,
            timestamp: tx.date.toISOString(),
            items: tx.items.map(item => ({
              itemId: item.item.id,
              name: item.item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity
            })),
            subtotal: tx.total,
            tax: 0,
            total: tx.total,
            paymentMethod: tx.paymentMethod,
            cashAmount: tx.cashAmount,
            qrisAmount: tx.qrisAmount,
            employeeId: "emp-test-uat",
            employeeName: "UAT Tester",
            status: "completed"
          };

          // Save receipt
          await db.add("receipts", receipt);

          // Save receipt items
          for (const item of tx.items) {
            const receiptItem: ReceiptItem = {
              id: `${tx.receiptNumber}-${item.item.id}`,
              receiptId: tx.receiptNumber,
              itemId: item.item.id,
              name: item.item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              timestamp: tx.date.toISOString()
            };
            await db.add("receiptItems", receiptItem);
          }

          // Update daily summaries
          await this.updateDailySummaries(tx);

          savedCount++;
        } catch (error) {
          this.errors.push(`Failed to save transaction ${tx.receiptNumber}: ${error}`);
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
      const existingSales = await db.getAll("dailyItemSales");
      const existing = existingSales.find(
        s => s.date === dateKey && s.itemId === item.item.id
      );

      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        await db.update("dailyItemSales", existing.id, existing);
      } else {
        const newSales: DailyItemSales = {
          id: `${dateKey}-${item.item.id}`,
          date: dateKey,
          itemId: item.item.id,
          itemName: item.item.name,
          quantity: item.quantity,
          revenue: item.price * item.quantity
        };
        await db.add("dailyItemSales", newSales);
      }
    }

    // Update daily payment sales
    const existingPayments = await db.getAll("dailyPaymentSales");
    const existingPayment = existingPayments.find(p => p.date === dateKey);

    if (existingPayment) {
      if (tx.paymentMethod === "cash" && tx.cashAmount) {
        existingPayment.cash += tx.cashAmount;
      } else if (tx.paymentMethod === "qris-static" && tx.qrisAmount) {
        existingPayment.qrisStatic += tx.qrisAmount;
      } else if (tx.paymentMethod === "qris-dynamic" && tx.qrisAmount) {
        existingPayment.qrisDynamic += tx.qrisAmount;
      } else if (tx.paymentMethod === "split") {
        existingPayment.cash += tx.cashAmount || 0;
        existingPayment.qrisStatic += tx.qrisAmount || 0; // Assume static for split
      }
      existingPayment.total += tx.total;
      await db.update("dailyPaymentSales", existingPayment.id, existingPayment);
    } else {
      const newPayment: DailyPaymentSales = {
        id: dateKey,
        date: dateKey,
        cash: tx.paymentMethod === "cash" || tx.paymentMethod === "split" ? (tx.cashAmount || 0) : 0,
        qrisStatic: (tx.paymentMethod === "qris-static" || (tx.paymentMethod === "split")) ? (tx.qrisAmount || 0) : 0,
        qrisDynamic: tx.paymentMethod === "qris-dynamic" ? (tx.qrisAmount || 0) : 0,
        voucher: 0,
        total: tx.total
      };
      await db.add("dailyPaymentSales", newPayment);
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
      const receipts = await db.getAll("receipts");
      const dayReceipts = receipts.filter(r => r.timestamp.startsWith(dateKey));
      const actualRevenue = dayReceipts.reduce((sum, r) => sum + r.total, 0);
      const actualTransactions = dayReceipts.length;

      const payments = await db.getAll("dailyPaymentSales");
      const dayPayment = payments.find(p => p.date === dateKey);
      const actualCashTotal = dayPayment?.cash || 0;
      const actualQrisTotal = (dayPayment?.qrisStatic || 0) + (dayPayment?.qrisDynamic || 0);

      // Validate
      const revenueMatch = Math.abs(expectedRevenue - actualRevenue) < 0.01;
      const transactionsMatch = expectedTransactions === actualTransactions;
      const cashMatch = Math.abs(expectedCashTotal - actualCashTotal) < 0.01;
      const qrisMatch = Math.abs(expectedQrisTotal - actualQrisTotal) < 0.01;

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
          if (!itemQuantities.has(item.item.id)) {
            itemQuantities.set(item.item.id, { name: item.item.name, quantity: 0 });
          }
          itemQuantities.get(item.item.id)!.quantity += item.quantity;
        }
      }

      const topItems: DailyValidation['topItems'] = [];
      const sortedItems = Array.from(itemQuantities.entries())
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 5);

      for (const [itemId, { name, quantity: expectedQuantity }] of sortedItems) {
        const dailyItemSales = await db.getAll("dailyItemSales");
        const actualSale = dailyItemSales.find(s => s.date === dateKey && s.itemId === itemId);
        const actualQuantity = actualSale?.quantity || 0;

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
        this.errors.push(`Date ${dateKey} validation failed`);
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