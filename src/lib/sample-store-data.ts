// src/lib/sample-store-data.ts
/**
 * Sample store data generator
 * Generates realistic POS data for testing and demo purposes
 * 
 * TWO-TIER SUMMARY ARCHITECTURE:
 * 1. Daily summaries (dailyItemSales, dailyPaymentSales) - last 30 days
 * 2. Monthly summaries (monthlyItemSales, monthlyPaymentSales, monthlySalesSummary) - aggregated by month
 * 
 * Reports query ONLY from summary tables, never from raw transactions
 * This keeps the POS fast and lean even after years of usage
 */

import type { Item, Employee, Settings, DailyItemSales, DailyPaymentSales, MonthlyItemSales, MonthlyPaymentSales, MonthlySalesSummary } from "@/types";

/**
 * Generate comprehensive summary data for reports
 * Creates both daily and monthly aggregates
 */
export function generateSampleStoreData() {
  const summaryData = generateSummaryData();
  const items = generateSampleItems();
  
  return {
    items,
    ...summaryData
  };
}

/**
 * Generate comprehensive summary data for reports
 * Creates both daily and monthly aggregates
 */
export function generateSummaryData() {
  console.log("📊 Generating summary data...");
  
  const today = new Date();
  
  // Generate daily data for last 35 days (detailed recent history for L30D)
  const dailyStartDate = new Date(today);
  dailyStartDate.setDate(dailyStartDate.getDate() - 35);
  
  // Generate monthly data for last 26 months (long-term trends)
  const monthlyStartDate = new Date(today);
  monthlyStartDate.setMonth(monthlyStartDate.getMonth() - 26);

  const dailyItemSales: Omit<DailyItemSales, "id">[] = [];
  const dailyPaymentSales: Omit<DailyPaymentSales, "id">[] = [];
  const monthlyItemSales: Omit<MonthlyItemSales, "id">[] = [];
  const monthlyPaymentSales: Omit<MonthlyPaymentSales, "id">[] = [];
  const monthlySalesSummary: Omit<MonthlySalesSummary, "id">[] = [];

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // Sample items for consistent data generation
  const sampleItems = [
    { id: 1, name: "Aqua 600ml", price: 3500, sku: "BEV001" },
    { id: 2, name: "Indomie Goreng", price: 3000, sku: "FOD001" },
    { id: 3, name: "Coca Cola 390ml", price: 5000, sku: "BEV002" },
    { id: 4, name: "Chitato Sapi", price: 8500, sku: "SNK001" },
    { id: 5, name: "Teh Botol Sosro", price: 4000, sku: "BEV003" },
    { id: 6, name: "Beng Beng", price: 2500, sku: "SNK002" },
    { id: 7, name: "Gudang Garam", price: 25000, sku: "CIG001" },
    { id: 8, name: "Pepsodent 225g", price: 12000, sku: "HYG001" },
    { id: 9, name: "Tissue Paseo", price: 15000, sku: "HYG002" },
    { id: 10, name: "Rinso Detergent", price: 18000, sku: "HSE001" },
  ];

  const paymentMethods = ["cash", "qris-static", "qris-dynamic", "voucher"];

  // Track monthly aggregates
  const monthlyItemsMap = new Map<string, Map<number, { name: string; sku: string; quantity: number; revenue: number; count: number }>>();
  const monthlyPaymentsMap = new Map<string, Map<string, { amount: number; count: number }>>();

  // Generate data day by day
  // We generate daily data for the whole period internally to build accurate monthly aggregates
  // But we only RETURN daily records for the last 35 days
  for (let d = new Date(monthlyStartDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    const yearMonth = dateStr.substring(0, 7); // YYYY-MM format

    // Generate 20-40 transactions per day
    const numTransactions = Math.floor(Math.random() * 20) + 20;

    // Track daily totals
    const dailyItemsMap = new Map<number, { name: string; sku: string; quantity: number; revenue: number; count: number }>();
    const dailyPaymentsMap = new Map<string, { amount: number; count: number }>();

    for (let t = 0; t < numTransactions; t++) {
      // Random item
      const item = sampleItems[Math.floor(Math.random() * sampleItems.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items per transaction
      const revenue = item.price * quantity;

      // Add to daily totals
      const dailyItem = dailyItemsMap.get(item.id) || { name: item.name, sku: item.sku, quantity: 0, revenue: 0, count: 0 };
      dailyItem.quantity += quantity;
      dailyItem.revenue += revenue;
      dailyItem.count += 1;
      dailyItemsMap.set(item.id, dailyItem);

      // Add to monthly totals
      if (!monthlyItemsMap.has(yearMonth)) {
        monthlyItemsMap.set(yearMonth, new Map());
      }
      const monthItems = monthlyItemsMap.get(yearMonth)!;
      const monthlyItem = monthItems.get(item.id) || { name: item.name, sku: item.sku, quantity: 0, revenue: 0, count: 0 };
      monthlyItem.quantity += quantity;
      monthlyItem.revenue += revenue;
      monthlyItem.count += 1;
      monthItems.set(item.id, monthlyItem);

      // Random payment method
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const amount = revenue;

      // Add to daily payment totals
      const dailyPayment = dailyPaymentsMap.get(method) || { amount: 0, count: 0 };
      dailyPayment.amount += amount;
      dailyPayment.count += 1;
      dailyPaymentsMap.set(method, dailyPayment);

      // Add to monthly payment totals
      if (!monthlyPaymentsMap.has(yearMonth)) {
        monthlyPaymentsMap.set(yearMonth, new Map());
      }
      const monthPayments = monthlyPaymentsMap.get(yearMonth)!;
      const monthlyPayment = monthPayments.get(method) || { amount: 0, count: 0 };
      monthlyPayment.amount += amount;
      monthlyPayment.count += 1;
      monthPayments.set(method, monthlyPayment);
    }

    // ONLY add to dailyItemSales/dailyPaymentSales if within the last 35 days
    if (d >= dailyStartDate) {
      // Create DailyItemSales records
      dailyItemsMap.forEach((data, itemId) => {
        dailyItemSales.push({
          businessDate: dateStr,
          itemId,
          sku: data.sku,
          itemName: data.name,
          totalQuantity: data.quantity,
          totalRevenue: data.revenue,
          transactionCount: data.count
        });
      });

      // Create DailyPaymentSales records
      dailyPaymentsMap.forEach((data, method) => {
        dailyPaymentSales.push({
          businessDate: dateStr,
          method: method as any,
          totalAmount: data.amount,
          transactionCount: data.count
        });
      });
    }
  }

  // Create MonthlyItemSales records
  monthlyItemsMap.forEach((items, month) => {
    items.forEach((data, itemId) => {
      monthlyItemSales.push({
        yearMonth: month,
        itemId,
        sku: data.sku,
        itemName: data.name,
        totalQuantity: data.quantity,
        totalRevenue: data.revenue,
        transactionCount: data.count
      });
    });
  });

  // Create MonthlyPaymentSales records
  monthlyPaymentsMap.forEach((payments, month) => {
    payments.forEach((data, method) => {
      monthlyPaymentSales.push({
        yearMonth: month,
        method: method as any,
        totalAmount: data.amount,
        transactionCount: data.count
      });
    });
  });

  // Create MonthlySalesSummary records
  monthlyPaymentsMap.forEach((payments, month) => {
    let totalRevenue = 0;
    let totalReceipts = 0;
    let cashAmount = 0;
    let qrisStaticAmount = 0;
    let qrisDynamicAmount = 0;
    let voucherAmount = 0;

    payments.forEach((data, method) => {
      totalRevenue += data.amount;
      totalReceipts += data.count;
      
      if (method === "cash") cashAmount = data.amount;
      else if (method === "qris-static") qrisStaticAmount = data.amount;
      else if (method === "qris-dynamic") qrisDynamicAmount = data.amount;
      else if (method === "voucher") voucherAmount = data.amount;
    });

    monthlySalesSummary.push({
      yearMonth: month,
      totalRevenue,
      totalReceipts,
      cashAmount,
      qrisStaticAmount,
      qrisDynamicAmount,
      voucherAmount
    });
  });

  console.log(`📊 Generated summary data:`);
  console.log(`  - Daily item sales: ${dailyItemSales.length} records (last 35 days)`);
  console.log(`  - Daily payment sales: ${dailyPaymentSales.length} records (last 35 days)`);
  console.log(`  - Monthly item sales: ${monthlyItemSales.length} records`);
  console.log(`  - Monthly payment sales: ${monthlyPaymentSales.length} records`);
  console.log(`  - Monthly sales summary: ${monthlySalesSummary.length} records`);

  return { dailyItemSales, dailyPaymentSales, monthlyItemSales, monthlyPaymentSales, monthlySalesSummary };
}

/**
 * Generate sample items for the store
 */
export function generateSampleItems(): Omit<Item, "id">[] {
  return [
    // Beverages
    { name: "Aqua 600ml", category: "Beverages", price: 3500, sku: "BEV001", stock: 100, isActive: true },
    { name: "Coca Cola 390ml", category: "Beverages", price: 5000, sku: "BEV002", stock: 80, isActive: true },
    { name: "Teh Botol Sosro", category: "Beverages", price: 4000, sku: "BEV003", stock: 120, isActive: true },
    { name: "Fanta Orange", category: "Beverages", price: 5000, sku: "BEV004", stock: 60, isActive: true },
    { name: "Sprite 390ml", category: "Beverages", price: 5000, sku: "BEV005", stock: 70, isActive: true },
    
    // Food
    { name: "Indomie Goreng", category: "Food", price: 3000, sku: "FOD001", stock: 200, isActive: true },
    { name: "Mie Sedaap", category: "Food", price: 2800, sku: "FOD002", stock: 150, isActive: true },
    { name: "Pop Mie", category: "Food", price: 6000, sku: "FOD003", stock: 80, isActive: true },
    
    // Snacks
    { name: "Chitato Sapi", category: "Snacks", price: 8500, sku: "SNK001", stock: 90, isActive: true },
    { name: "Beng Beng", category: "Snacks", price: 2500, sku: "SNK002", stock: 120, isActive: true },
    { name: "Better Chocolate", category: "Snacks", price: 3000, sku: "SNK003", stock: 100, isActive: true },
    { name: "Oreo", category: "Snacks", sku: "SNK004", stock: 85, isActive: true, price: 10000 },
    
    // Cigarettes
    { name: "Gudang Garam", category: "Cigarettes", price: 25000, sku: "CIG001", stock: 50, isActive: true },
    { name: "Sampoerna Mild", category: "Cigarettes", price: 28000, sku: "CIG002", stock: 45, isActive: true },
    
    // Hygiene
    { name: "Pepsodent 225g", category: "Hygiene", price: 12000, sku: "HYG001", stock: 40, isActive: true },
    { name: "Tissue Paseo", category: "Hygiene", price: 15000, sku: "HYG002", stock: 30, isActive: true },
    { name: "Sabun Lifebuoy", category: "Hygiene", price: 8000, sku: "HYG003", stock: 60, isActive: true },
    
    // Household
    { name: "Rinso Detergent", category: "Household", price: 18000, sku: "HSE001", stock: 35, isActive: true },
    { name: "Sunlight 800ml", category: "Household", price: 15000, sku: "HSE002", stock: 40, isActive: true },
  ];
}

/**
 * Generate sample employees
 */
export function generateSampleEmployees(): Omit<Employee, "id">[] {
  return [
    { name: "Admin", pin: "0000", role: "admin", createdAt: Date.now(), isActive: true },
    { name: "John Doe", pin: "1234", role: "cashier", createdAt: Date.now(), isActive: true },
    { name: "Jane Smith", pin: "5678", role: "cashier", createdAt: Date.now(), isActive: true },
    { name: "Mike Wilson", pin: "9012", role: "employee", createdAt: Date.now(), isActive: true },
    { name: "Sarah Johnson", pin: "3456", role: "employee", createdAt: Date.now(), isActive: true },
  ];
}

/**
 * Get default settings
 */
export function getDefaultSettings(): Settings {
  return {
    key: "settings",
    mode: "retail",
    tax1Enabled: true,
    tax1Label: "PPN",
    tax1Rate: 11,
    tax1Inclusive: false,
    tax2Enabled: false,
    tax2Label: "Service",
    tax2Rate: 5,
    tax2Inclusive: false,
    language: "en",
    printerWidth: 58,
    businessName: "SELL MORE",
    businessAddress: "Jl. Raya No. 123, Jakarta",
    taxId: "01.234.567.8-901.000",
    receiptFooter: "Thank you for your purchase!",
    googleDriveLinked: false,
    allowPriceOverride: false,
    shifts: {
      shift1: { enabled: true, name: "Morning Shift", startTime: "08:00", endTime: "16:00" },
      shift2: { enabled: true, name: "Evening Shift", startTime: "16:00", endTime: "00:00" },
      shift3: { enabled: false, name: "Night Shift", startTime: "00:00", endTime: "08:00" },
    },
    paymentMethods: {
      cash: true,
      card: true,
      ewallet: true,
      qr: true,
      transfer: true
    }
  };
}