export type POSMode = "retail" | "cafe";

export type UserRole = "admin" | "cashier" | "employee";

export type Language = "en" | "id" | "zh";

export type PaymentMethod = "cash" | "qris-static" | "qris-dynamic" | "voucher";

export interface Employee {
  id?: number;
  name: string;
  pin: string;
  role: UserRole;
  createdAt: number;
}

export interface AttendanceRecord {
  id?: number;
  employeeId: number;
  employeeName: string;
  clockIn: number;
  clockOut?: number;
  date: string; // YYYY-MM-DD format for easy querying
}

export interface Item {
  id?: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  variants?: ItemVariant[];
  modifiers?: ItemModifier[];
}

export interface ItemVariant {
  name: string;
  priceAdjustment: number;
}

export interface ItemModifier {
  name: string;
  price: number;
}

export interface CartItem {
  itemId: number;
  sku: string;
  name: string;
  basePrice: number;
  quantity: number;
  variant?: string;
  modifiers?: string[];
  totalPrice: number;
}

export interface PaymentRecord {
  method: PaymentMethod;
  amount: number;
  qrisRef?: string; // For QRIS transaction reference
}

export interface Transaction {
  id?: number;
  timestamp: number;
  businessDate: string;      // YYYY-MM-DD (shift start date)
  shiftId: string;           // "2026-01-28-shift-1"
  cashierId: number;
  cashierName: string;
  mode: POSMode;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payments: PaymentRecord[];
  change?: number;
}

export interface Shift {
  id?: number;
  shiftId: string;           // "2026-01-28-shift-1"
  businessDate: string;      // YYYY-MM-DD (assigned to shift)
  cashierId: number;
  cashierName: string;
  shiftStart: number;        // Login timestamp
  shiftEnd?: number;         // Logout timestamp
  calendarDayStart: string;  // YYYY-MM-DD (actual calendar date)
  status: "active" | "closed";
}

export interface DailyAttendance {
  id?: number;
  employeeId: number;
  employeeName: string;
  date: string;              // YYYY-MM-DD
  clockIn: number;
  clockOut: number;
  hoursWorked: number;
  isLate: boolean;
}

export interface DailyItemSales {
  id?: number;
  itemId: number;
  sku: string;
  itemName: string;
  businessDate: string;      // YYYY-MM-DD
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface DailyPaymentSales {
  id?: number;
  method: PaymentMethod;
  businessDate: string;      // YYYY-MM-DD
  totalAmount: number;
  transactionCount: number;
}

export interface DailyShiftSummary {
  id?: number;
  shiftId: string;
  businessDate: string;
  cashierId: number;
  cashierName: string;
  totalRevenue: number;
  totalReceipts: number;
  paymentBreakdown: {
    cash: number;
    qrisStatic: number;
    qrisDynamic: number;
    voucher: number;
  };
  hoursWorked: number;
}

export interface MonthlyItemSales {
  id?: number;
  itemId: number;
  sku: string;
  itemName: string;
  month: string;             // YYYY-MM
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface MonthlySalesSummary {
  id?: number;
  month: string;             // YYYY-MM
  totalRevenue: number;
  totalReceipts: number;
  cashAmount: number;
  qrisStaticAmount: number;
  qrisDynamicAmount: number;
  voucherAmount: number;
}

export interface MonthlyAttendanceSummary {
  id?: number;
  employeeId: number;
  employeeName: string;
  month: string;             // YYYY-MM
  totalHours: number;
  daysWorked: number;
  lateCount: number;
}

export interface ShiftReport {
  cashierId: number;
  cashierName: string;
  shiftStart: number;
  shiftEnd: number;
  totalReceipts: number;
  totalAmount: number;
  paymentBreakdown: {
    cash: number;
    qrisStatic: number;
    qrisDynamic: number;
    voucher: number;
  };
}

export interface PauseState {
  id: number;
  cashierId: number;
  cart: CartItem[];
  timestamp: number;
  mode: POSMode;
}

export interface AppSettings {
  key: string;
  mode: POSMode;
  printerWidth: 58 | 80;
  taxRate: number;
  googleDriveLinked: boolean;
  language: Language;
  businessName?: string;
  receiptFooter?: string;
}

export type Settings = AppSettings;