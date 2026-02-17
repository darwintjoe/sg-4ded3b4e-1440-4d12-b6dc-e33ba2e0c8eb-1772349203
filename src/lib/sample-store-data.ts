import { 
  Item, 
  Employee, 
  Transaction, 
  Settings, 
  DailyPaymentSales, 
  MonthlyPaymentSales, 
  MonthlySalesSummary,
  CartItem,
  UserRole,
  DailyItemSales,
  MonthlyItemSales,
  DailyAttendance,
  MonthlyAttendanceSummary
} from "@/types";

/**
 * Generate comprehensive sample data for new users
 * Following Two-Tier Summary Architecture:
 * - Transactions: Last 60 days only
 * - Daily summaries: Last 60 days only
 * - Monthly summaries: Full 26 months (2023-12 to 2026-01)
 * 
 * Total: ~10,000 records (optimized for performance)
 */

// Convenience store item categories with realistic products
export const SAMPLE_ITEMS_DATA = {
  "Snacks": [
    { name: "Chitato BBQ", price: 12000, barcode: "8992760221011" },
    { name: "Lays Original", price: 15000, barcode: "8991002100015" },
    { name: "Cheetos Cheese", price: 10000, barcode: "8992760221028" },
    { name: "Doritos Nacho", price: 13000, barcode: "8991002100022" },
    { name: "Pringles Original", price: 25000, barcode: "8992760221035" },
    { name: "Oreo Original", price: 8000, barcode: "8991002100039" },
    { name: "Biskuat Choco", price: 5000, barcode: "8992760221042" },
    { name: "Better Chocolate", price: 7000, barcode: "8991002100046" },
    { name: "Ritz Crackers", price: 9000, barcode: "8992760221059" },
    { name: "Pocky Chocolate", price: 6000, barcode: "8992760221066" },
    { name: "Selamat Kacang", price: 4000, barcode: "8991002100060" },
    { name: "Beng Beng", price: 2500, barcode: "8992760221073" },
    { name: "SilverQueen", price: 11000, barcode: "8991002100077" },
    { name: "Cadbury Dairy Milk", price: 18000, barcode: "8992760221080" },
    { name: "KitKat", price: 5000, barcode: "8991002100084" },
    { name: "Snickers", price: 7000, barcode: "8992760221097" },
    { name: "M&Ms", price: 12000, barcode: "8991002100091" },
    { name: "Twix", price: 8000, barcode: "8992760221103" },
    { name: "Mentos Mint", price: 3000, barcode: "8991002100107" },
  ],
  "Beverages": [
    { name: "Aqua 600ml", price: 4000, barcode: "8991001100014" },
    { name: "Coca Cola 330ml", price: 6000, barcode: "8991001100021" },
    { name: "Pepsi 330ml", price: 6000, barcode: "8991001100038" },
    { name: "Fanta Orange", price: 6000, barcode: "8991001100045" },
    { name: "Sprite 330ml", price: 6000, barcode: "8991001100052" },
    { name: "Teh Botol Sosro", price: 5000, barcode: "8991001100069" },
    { name: "Fruit Tea", price: 5000, barcode: "8991001100076" },
    { name: "Pocari Sweat", price: 7000, barcode: "8991001100083" },
    { name: "Mizone", price: 6000, barcode: "8991001100090" },
    { name: "Le Minerale", price: 3500, barcode: "8991001100106" },
    { name: "Teh Pucuk", price: 4000, barcode: "8991001100113" },
    { name: "Ale Ale", price: 3000, barcode: "8991001100120" },
    { name: "Kopiko Coffee", price: 6000, barcode: "8991001100137" },
    { name: "ABC Coffee", price: 8000, barcode: "8991001100144" },
    { name: "Nescafe Classic", price: 10000, barcode: "8991001100151" },
    { name: "Yakult", price: 12000, barcode: "8991001100168" },
    { name: "Cimory Yogurt", price: 15000, barcode: "8991001100175" },
    { name: "Ultra Milk", price: 9000, barcode: "8991001100182" },
    { name: "Indomilk", price: 8000, barcode: "8991001100199" },
    { name: "Bear Brand", price: 11000, barcode: "8991001100205" },
    { name: "Red Bull", price: 20000, barcode: "8991001100212" },
    { name: "Kratingdaeng", price: 8000, barcode: "8991001100229" },
    { name: "Extra Joss", price: 2000, barcode: "8991001100236" },
    { name: "Good Day Cappuccino", price: 12000, barcode: "8991001100243" },
    { name: "ABC Heinz Ketchup", price: 15000, barcode: "8991001100250" },
  ],
  "Instant Food": [
    { name: "Indomie Goreng", price: 3500, barcode: "8992760100012" },
    { name: "Indomie Soto", price: 3500, barcode: "8992760100029" },
    { name: "Indomie Ayam Bawang", price: 3500, barcode: "8992760100036" },
    { name: "Mie Sedaap Goreng", price: 3000, barcode: "8992760100043" },
    { name: "Mie Gelas", price: 5000, barcode: "8992760100050" },
    { name: "Pop Mie", price: 6000, barcode: "8992760100067" },
    { name: "Sarimi Isi 2", price: 4000, barcode: "8992760100074" },
    { name: "Supermie", price: 3000, barcode: "8992760100081" },
    { name: "Lemonilo", price: 7000, barcode: "8992760100098" },
    { name: "Indofood Bumbu Racik", price: 2000, barcode: "8992760100104" },
    { name: "Kecap Bango", price: 8000, barcode: "8992760100111" },
    { name: "Saus Sambal ABC", price: 10000, barcode: "8992760100128" },
    { name: "Royco Ayam", price: 6000, barcode: "8992760100135" },
    { name: "Masako Sapi", price: 6000, barcode: "8992760100142" },
    { name: "Sunlight 800ml", price: 15000, barcode: "8992760100159" },
  ],
  "Personal Care": [
    { name: "Pepsodent", price: 8000, barcode: "8993560100013" },
    { name: "Close Up", price: 9000, barcode: "8993560100020" },
    { name: "Sikat Gigi Formula", price: 5000, barcode: "8993560100037" },
    { name: "Lifebouy Sabun", price: 4000, barcode: "8993560100044" },
    { name: "Dettol Soap", price: 6000, barcode: "8993560100051" },
    { name: "Pantene Shampoo", price: 2000, barcode: "8993560100068" },
    { name: "Clear Shampoo", price: 2500, barcode: "8993560100075" },
    { name: "Sunsilk Shampoo", price: 2000, barcode: "8993560100082" },
    { name: "Dove Shampoo", price: 3000, barcode: "8993560100099" },
    { name: "Rejoice Shampoo", price: 2000, barcode: "8993560100105" },
    { name: "Vaseline Lotion", price: 15000, barcode: "8993560100112" },
    { name: "Citra Lotion", price: 12000, barcode: "8993560100129" },
    { name: "Marina Lotion", price: 8000, barcode: "8993560100136" },
    { name: "Tissue Paseo", price: 6000, barcode: "8993560100143" },
    { name: "Charm Pembalut", price: 10000, barcode: "8993560100150" },
    { name: "Softex Pembalut", price: 9000, barcode: "8993560100167" },
    { name: "Diapers Merries", price: 45000, barcode: "8993560100174" },
    { name: "Mamy Poko", price: 35000, barcode: "8993560100181" },
    { name: "Baby Oil", price: 18000, barcode: "8993560100198" },
    { name: "Bedak Bayi", price: 12000, barcode: "8993560100204" },
  ],
  "Household": [
    { name: "Beras 1kg", price: 15000, barcode: "8994560100011" },
    { name: "Minyak Goreng 1L", price: 18000, barcode: "8994560100028" },
    { name: "Gula Pasir 1kg", price: 14000, barcode: "8994560100035" },
    { name: "Garam 250g", price: 3000, barcode: "8994560100042" },
    { name: "Telur 1/4kg", price: 8000, barcode: "8994560100059" },
    { name: "Kopi Kapal Api", price: 12000, barcode: "8994560100066" },
    { name: "Teh Celup Sariwangi", price: 7000, barcode: "8994560100073" },
    { name: "Susu Kental Manis", price: 9000, barcode: "8994560100080" },
    { name: "Tepung Terigu", price: 10000, barcode: "8994560100097" },
    { name: "Sabun Cuci Piring", price: 12000, barcode: "8994560100103" },
    { name: "Molto Pelembut", price: 8000, barcode: "8994560100110" },
    { name: "Rinso Detergen", price: 20000, barcode: "8994560100127" },
    { name: "Baygon Spray", price: 25000, barcode: "8994560100134" },
    { name: "Stella Pengharum", price: 8000, barcode: "8994560100141" },
    { name: "Kamper Anti Nyamuk", price: 15000, barcode: "8994560100158" },
  ],
  "Cigarettes": [
    { name: "Gudang Garam Filter", price: 25000, barcode: "8995560100010" },
    { name: "Sampoerna Mild", price: 28000, barcode: "8995560100027" },
    { name: "Djarum Super", price: 24000, barcode: "8995560100034" },
    { name: "LA Lights", price: 20000, barcode: "8995560100041" },
    { name: "Marlboro Merah", price: 35000, barcode: "8995560100058" },
    { name: "Surya 16", price: 18000, barcode: "8995560100065" },
    { name: "Esse", price: 22000, barcode: "8995560100072" },
    { name: "U Mild", price: 23000, barcode: "8995560100089" },
  ],
  "Ice Cream": [
    { name: "Magnum Classic", price: 15000, barcode: "8996560100019" },
    { name: "Walls Feast", price: 12000, barcode: "8996560100026" },
    { name: "Paddle Pop", price: 5000, barcode: "8996560100033" },
    { name: "Campina", price: 8000, barcode: "8996560100040" },
    { name: "Cornetto", price: 10000, barcode: "8996560100057" },
  ],
  "Frozen Food": [
    { name: "Nugget Fiesta", price: 18000, barcode: "8997560100018" },
    { name: "Sosis So Nice", price: 15000, barcode: "8997560100025" },
    { name: "Bakso Sapi", price: 20000, barcode: "8997560100032" },
    { name: "French Fries", price: 12000, barcode: "8997560100049" },
    { name: "Dimsum Frozen", price: 25000, barcode: "8997560100056" },
  ],
  "Bread & Bakery": [
    { name: "Roti Tawar Sari Roti", price: 12000, barcode: "8998560100017" },
    { name: "Roti Sobek", price: 8000, barcode: "8998560100024" },
    { name: "Roti Aoka", price: 5000, barcode: "8998560100031" },
    { name: "Roti Sisir", price: 6000, barcode: "8998560100048" },
    { name: "Roti Isi Coklat", price: 4000, barcode: "8998560100055" },
  ],
  "Stationery": [
    { name: "Pulpen Standard", price: 3000, barcode: "8999560100016" },
    { name: "Pensil 2B", price: 2000, barcode: "8999560100023" },
    { name: "Penghapus", price: 1500, barcode: "8999560100030" },
    { name: "Buku Tulis", price: 5000, barcode: "8999560100047" },
    { name: "Tipe-X", price: 6000, barcode: "8999560100054" },
    { name: "Lem UHU", price: 8000, barcode: "8999560100061" },
    { name: "Gunting", price: 10000, barcode: "8999560100078" },
    { name: "Stapler", price: 15000, barcode: "8999560100085" },
  ],
  "Phone Accessories": [
    { name: "Kabel Data Micro USB", price: 20000, barcode: "8990560100015" },
    { name: "Kabel Data Type C", price: 25000, barcode: "8990560100022" },
    { name: "Earphone", price: 30000, barcode: "8990560100039" },
    { name: "Powerbank 10000mAh", price: 150000, barcode: "8990560100046" },
    { name: "Tempered Glass", price: 35000, barcode: "8990560100053" },
    { name: "Case HP", price: 25000, barcode: "8990560100060" },
    { name: "Pulsa 10k", price: 11000, barcode: "8990560100077" },
    { name: "Pulsa 25k", price: 26000, barcode: "8990560100084" },
    { name: "Pulsa 50k", price: 51000, barcode: "8990560100091" },
    { name: "Pulsa 100k", price: 101000, barcode: "8990560100107" },
  ],
};

const SAMPLE_EMPLOYEES = [
  { name: "Ahmad", pin: "1111", role: "cashier" as const, shift: "shift1" },
  { name: "Siti", pin: "2222", role: "cashier" as const, shift: "shift1" },
  { name: "Budi", pin: "3333", role: "cashier" as const, shift: "shift2" },
  { name: "Dewi", pin: "4444", role: "cashier" as const, shift: "shift2" },
  { name: "Rudi", pin: "5555", role: "cashier" as const, shift: "shift3" },
  { name: "Maya", pin: "6666", role: "cashier" as const, shift: "shift3" },
  { name: "Andi", pin: "7777", role: "admin" as const, shift: "shift1" },
  { name: "Linda", pin: "8888", role: "admin" as const, shift: "shift2" },
];

export function generateSampleItems(): Item[] {
  const items: Item[] = [];
  let itemId = 1;

  for (const [category, products] of Object.entries(SAMPLE_ITEMS_DATA)) {
    for (const product of products) {
      items.push({
        id: itemId,
        name: product.name,
        price: product.price,
        category,
        sku: product.barcode,
        stock: Math.floor(Math.random() * 100) + 20,
        isActive: true,
      });
      itemId++;
    }
  }

  return items;
}

export function generateSampleEmployees(): Employee[] {
  return SAMPLE_EMPLOYEES.map((emp, index) => ({
    id: index + 1,
    name: emp.name,
    pin: emp.pin,
    role: emp.role as UserRole,
    createdAt: Date.now(),
    isActive: true
  }));
}

/**
 * Generate sample data following Two-Tier Summary Architecture
 * - Transactions: Last 60 days only
 * - Daily summaries: Last 60 days only  
 * - Monthly summaries: Full 26 months (2023-12 to 2026-01)
 */
export function generateSampleTransactions(items: Item[], employees: Employee[]): {
  transactions: Transaction[];
  dailySummaries: DailyPaymentSales[];
  dailyItemSales: DailyItemSales[];
  dailyAttendance: DailyAttendance[];
  monthlyItemSales: MonthlyItemSales[];
  monthlySummaries: { payments: MonthlyPaymentSales[]; summary: MonthlySalesSummary[] };
  monthlyAttendanceSummaries: MonthlyAttendanceSummary[];
} {
  const transactions: Transaction[] = [];
  const dailyMap = new Map<string, Map<string, number>>();
  const dailyItemMap = new Map<string, Map<number, { quantity: number; revenue: number; count: number; itemName: string; sku: string }>>();
  const dailyAttendanceMap = new Map<string, Map<number, { checkIn: number; checkOut: number | null; hoursWorked: number }>>();
  
  // Monthly maps for 26 months of synthetic data
  const monthlyItemMap = new Map<string, Map<number, { quantity: number; revenue: number; count: number; itemName: string; sku: string }>>();
  const monthlyPaymentMap = new Map<string, Map<string, number>>();
  const monthlyAttendanceMap = new Map<string, Map<number, { totalHours: number; daysWorked: number }>>();
  
  const paymentMethods = ["cash", "qris-static", "qris-dynamic", "voucher"];
  
  // Generate transactions for LAST 60 DAYS ONLY
  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(today.getDate() - 59); // 59 days ago + today = 60 days
  
  let transactionId = 1;
  
  // Generate transactions for last 60 days
  for (let d = new Date(sixtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const baseTransactionsPerDay = isWeekend ? 50 : 35;
    const transactionsToday = Math.floor(baseTransactionsPerDay + Math.random() * 20);
    
    for (let i = 0; i < transactionsToday; i++) {
      const hour = 7 + Math.floor(Math.random() * 15);
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(d);
      timestamp.setHours(hour, minute, 0, 0);
      
      const itemCount = Math.floor(Math.random() * 5) + 1;
      const transactionItems: CartItem[] = [];
      let subtotal = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        transactionItems.push({ 
          itemId: randomItem.id || 0,
          sku: randomItem.sku || "",
          name: randomItem.name,
          basePrice: randomItem.price,
          quantity: quantity,
          totalPrice: randomItem.price * quantity
        });
        subtotal += randomItem.price * quantity;
        
        // Track daily item sales
        if (!dailyItemMap.has(dateStr)) {
          dailyItemMap.set(dateStr, new Map());
        }
        const dayItemMap = dailyItemMap.get(dateStr)!;
        const itemStats = dayItemMap.get(randomItem.id || 0) || { 
          quantity: 0, 
          revenue: 0, 
          count: 0, 
          itemName: randomItem.name,
          sku: randomItem.sku || ""
        };
        itemStats.quantity += quantity;
        itemStats.revenue += randomItem.price * quantity;
        itemStats.count += 1;
        dayItemMap.set(randomItem.id || 0, itemStats);
      }
      
      const cashiers = employees.filter(e => e.role === "cashier");
      const employee = Math.random() < 0.9 
        ? cashiers[Math.floor(Math.random() * cashiers.length)]
        : employees[Math.floor(Math.random() * employees.length)];
      
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      const transaction: Transaction = {
        id: transactionId,
        timestamp: timestamp.getTime(),
        businessDate: dateStr,
        shiftId: "shift1",
        cashierId: employee.id || 0,
        cashierName: employee.name,
        mode: "retail",
        items: transactionItems,
        subtotal,
        tax: 0,
        total: subtotal,
        payments: [{
          method: paymentMethod as any,
          amount: subtotal
        }],
        change: 0,
      };
      
      transactions.push(transaction);
      transactionId++;
      
      // Track daily payment sales
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, new Map());
      }
      const dayMap = dailyMap.get(dateStr)!;
      dayMap.set(paymentMethod, (dayMap.get(paymentMethod) || 0) + subtotal);
    }
    
    // Track daily attendance (simplified - one entry per employee per day)
    if (!dailyAttendanceMap.has(dateStr)) {
      dailyAttendanceMap.set(dateStr, new Map());
    }
    const attendanceMap = dailyAttendanceMap.get(dateStr)!;
    
    // Random 5-7 employees work each day
    const workingEmployees = [...employees]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5 + Math.floor(Math.random() * 3));
    
    for (const emp of workingEmployees) {
      const checkInHour = 7 + Math.floor(Math.random() * 2);
      const checkIn = new Date(d);
      checkIn.setHours(checkInHour, Math.floor(Math.random() * 60), 0, 0);
      
      const workHours = 7 + Math.floor(Math.random() * 3);
      const checkOut = new Date(checkIn);
      checkOut.setHours(checkIn.getHours() + workHours);
      
      attendanceMap.set(emp.id || 0, {
        checkIn: checkIn.getTime(),
        checkOut: checkOut.getTime(),
        hoursWorked: workHours
      });
    }
  }
  
  // Generate SYNTHETIC monthly summaries for 26 months (2023-12 to 2026-01)
  const startMonth = new Date("2023-12-01");
  const endMonth = new Date("2026-01-31");
  
  for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
    const monthStr = m.toISOString().substring(0, 7); // YYYY-MM
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    
    // Generate synthetic monthly item sales
    if (!monthlyItemMap.has(monthStr)) {
      monthlyItemMap.set(monthStr, new Map());
    }
    const monthItemMap = monthlyItemMap.get(monthStr)!;
    
    // Random 80-100 unique items sold per month
    const itemsThisMonth = [...items]
      .sort(() => Math.random() - 0.5)
      .slice(0, 80 + Math.floor(Math.random() * 21));
    
    for (const item of itemsThisMonth) {
      const avgDailyQty = 3 + Math.floor(Math.random() * 10);
      const totalQty = avgDailyQty * daysInMonth;
      const revenue = totalQty * item.price;
      
      monthItemMap.set(item.id || 0, {
        quantity: totalQty,
        revenue,
        count: Math.floor(totalQty * 0.7), // Approximate transaction count
        itemName: item.name,
        sku: item.sku || ""
      });
    }
    
    // Generate synthetic monthly payment sales
    if (!monthlyPaymentMap.has(monthStr)) {
      monthlyPaymentMap.set(monthStr, new Map());
    }
    const monthPaymentMap = monthlyPaymentMap.get(monthStr)!;
    
    const baseTransactionsPerMonth = daysInMonth * 42; // Average 42 transactions/day
    const totalRevenue = Math.floor(baseTransactionsPerMonth * (80000 + Math.random() * 40000));
    
    // Distribute across payment methods (realistic ratios)
    monthPaymentMap.set("cash", Math.floor(totalRevenue * 0.45));
    monthPaymentMap.set("qris-static", Math.floor(totalRevenue * 0.30));
    monthPaymentMap.set("qris-dynamic", Math.floor(totalRevenue * 0.20));
    monthPaymentMap.set("voucher", Math.floor(totalRevenue * 0.05));
    
    // Generate synthetic monthly attendance
    if (!monthlyAttendanceMap.has(monthStr)) {
      monthlyAttendanceMap.set(monthStr, new Map());
    }
    const monthAttendanceMap = monthlyAttendanceMap.get(monthStr)!;
    
    for (const emp of employees) {
      const daysWorked = 20 + Math.floor(Math.random() * 6); // 20-25 days
      const avgHoursPerDay = 7 + Math.random() * 2;
      const totalHours = Math.floor(daysWorked * avgHoursPerDay);
      
      monthAttendanceMap.set(emp.id || 0, {
        totalHours,
        daysWorked
      });
    }
  }
  
  // Convert to output format
  const dailySummaries: DailyPaymentSales[] = [];
  for (const [date, paymentMap] of dailyMap.entries()) {
    for (const [method, total] of paymentMap.entries()) {
      dailySummaries.push({
        businessDate: date,
        method: method as any,
        totalAmount: total,
        transactionCount: 0
      });
    }
  }
  
  const dailyItemSales: DailyItemSales[] = [];
  for (const [date, itemMap] of dailyItemMap.entries()) {
    for (const [itemId, stats] of itemMap.entries()) {
      dailyItemSales.push({
        businessDate: date,
        itemId,
        sku: stats.sku,
        itemName: stats.itemName,
        totalQuantity: stats.quantity,
        totalRevenue: stats.revenue,
        transactionCount: stats.count
      });
    }
  }
  
  const dailyAttendance: DailyAttendance[] = [];
  for (const [date, attendanceMap] of dailyAttendanceMap.entries()) {
    for (const [employeeId, record] of attendanceMap.entries()) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        dailyAttendance.push({
          date: date,
          employeeId,
          employeeName: employee.name,
          clockIn: record.checkIn,
          clockOut: record.checkOut || 0,
          hoursWorked: record.hoursWorked,
          isLate: false
        });
      }
    }
  }
  
  const monthlyItemSales: MonthlyItemSales[] = [];
  for (const [month, itemMap] of monthlyItemMap.entries()) {
    for (const [itemId, stats] of itemMap.entries()) {
      monthlyItemSales.push({
        yearMonth: month,
        itemId,
        sku: stats.sku,
        itemName: stats.itemName,
        totalQuantity: stats.quantity,
        totalRevenue: stats.revenue,
        transactionCount: stats.count
      });
    }
  }
  
  const monthlyPayments: MonthlyPaymentSales[] = [];
  const monthlySummary: MonthlySalesSummary[] = [];
  
  for (const [month, paymentMap] of monthlyPaymentMap.entries()) {
    let monthTotal = 0;
    let cashAmount = 0;
    let qrisStaticAmount = 0;
    let qrisDynamicAmount = 0;
    let voucherAmount = 0;

    for (const [method, total] of paymentMap.entries()) {
      monthlyPayments.push({
        yearMonth: month,
        method: method as any,
        totalAmount: total,
        transactionCount: 0
      });
      monthTotal += total;

      if (method === "cash") cashAmount = total;
      else if (method === "qris-static") qrisStaticAmount = total;
      else if (method === "qris-dynamic") qrisDynamicAmount = total;
      else if (method === "voucher") voucherAmount = total;
    }
    
    monthlySummary.push({
      yearMonth: month,
      totalRevenue: monthTotal,
      totalReceipts: Math.floor(monthTotal / 100000),
      cashAmount,
      qrisStaticAmount,
      qrisDynamicAmount,
      voucherAmount
    });
  }
  
  const monthlyAttendanceSummaries: MonthlyAttendanceSummary[] = [];
  for (const [month, attendanceMap] of monthlyAttendanceMap.entries()) {
    for (const [employeeId, stats] of attendanceMap.entries()) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        monthlyAttendanceSummaries.push({
          yearMonth: month,
          employeeId,
          employeeName: employee.name,
          totalHours: stats.totalHours,
          daysWorked: stats.daysWorked,
          lateCount: Math.floor(Math.random() * 3)
        });
      }
    }
  }
  
  return {
    transactions,
    dailySummaries,
    dailyItemSales,
    dailyAttendance,
    monthlyItemSales,
    monthlySummaries: {
      payments: monthlyPayments,
      summary: monthlySummary,
    },
    monthlyAttendanceSummaries
  };
}

export function getDefaultSettings(): Settings {
  return {
    key: "default",
    mode: "retail",
    businessName: "Sample Store",
    businessAddress: "123 Main Street\nJakarta, Indonesia",
    taxId: "12.345.678.9-012.000",
    receiptFooter: "Thank you for shopping!\nVisit us again soon!",
    language: "en",
    tax1Enabled: true,
    tax1Label: "PPN",
    tax1Rate: 11,
    tax1Inclusive: false,
    tax2Enabled: false,
    tax2Label: "Service Charge",
    tax2Rate: 0,
    tax2Inclusive: false,
    printerWidth: 58,
    allowPriceOverride: false,
    googleDriveLinked: false,
    paymentMethods: {
      cash: true,
      card: true,
      ewallet: true,
      qr: true,
      transfer: true,
    },
    shifts: {
      shift1: { enabled: true, name: "Morning Shift", startTime: "07:00", endTime: "15:00" },
      shift2: { enabled: true, name: "Afternoon Shift", startTime: "15:00", endTime: "23:00" },
      shift3: { enabled: false, name: "Night Shift", startTime: "23:00", endTime: "07:00" },
    },
  };
}

export function generateSampleStoreData() {
  const items = generateSampleItems();
  const employees = generateSampleEmployees();
  const transactionData = generateSampleTransactions(items, employees);
  
  return {
    items,
    employees,
    transactions: transactionData.transactions,
    dailySummaries: transactionData.dailySummaries,
    dailyItemSales: transactionData.dailyItemSales,
    dailyAttendance: transactionData.dailyAttendance,
    monthlyItemSales: transactionData.monthlyItemSales,
    monthlySummaries: transactionData.monthlySummaries,
    monthlyAttendanceSummaries: transactionData.monthlyAttendanceSummaries,
    settings: getDefaultSettings()
  };
}

export function generateSummaryData(transactions: Transaction[]) {
  return {};
}