export type POSMode = "retail" | "cafe";

export type UserRole = "admin" | "cashier" | "employee";

export type Language = "en" | "id" | "zh";

export type PaymentMethod = "cash" | "qris-static" | "qris-dynamic" | "voucher";

export interface Employee {
  id?: number;
  name: string;
  pin: string;
  role: UserRole;
  joinDate?: number;
  createdAt: number;
  isActive?: boolean;
}

export interface Attendance {
  id?: number;
  employeeId: number;
  employeeName: string;
  businessDate: string;
  clockIn: number;
  clockOut?: number;
  hoursWorked?: number;
}

export interface AttendanceRecord {
  id?: number;
  employeeId: number;
  employeeName: string;
  clockIn: number;
  clockOut?: number;
  date: string;
}

export interface Item {
  id?: number;
  sku?: string;
  name: string;
  category: string;
  price: number;
  variants?: ItemVariant[];
  modifiers?: ItemModifier[];
  isActive?: boolean;
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
  qrisRef?: string;
}

export interface Transaction {
  id?: number;
  timestamp: number;
  businessDate: string;
  shiftId: string;
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
  shiftId: string;
  businessDate: string;
  cashierId: number;
  cashierName: string;
  shiftStart: number;
  shiftEnd?: number;
  calendarDayStart: string;
  status: "active" | "closed";
}

export interface DailyAttendance {
  id?: number;
  employeeId: number;
  employeeName: string;
  date: string;
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
  businessDate: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface DailyPaymentSales {
  id?: number;
  method: PaymentMethod;
  businessDate: string;
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
  month: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface MonthlyPaymentSales {
  id?: number;
  method: PaymentMethod;
  month: string;
  totalAmount: number;
  transactionCount: number;
}

export interface MonthlySalesSummary {
  id?: number;
  month: string;
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
  month: string;
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

export interface CashierSession {
  id?: number;
  employeeId: number;
  employeeName: string;
  role: UserRole;
  loginTime: number;
  lastActivity: number;
  cartState: CartItem[];
  shiftActive: boolean;
  mode: POSMode;
}

export interface Settings {
  key: string;
  mode: POSMode;
  tax1Enabled: boolean;
  tax1Label: string;
  tax1Rate: number;
  tax1Inclusive: boolean;
  tax2Enabled: boolean;
  tax2Label: string;
  tax2Rate: number;
  tax2Inclusive: boolean;
  language: Language;
  printerWidth: number;
  businessName: string;
  businessLogo?: string;
  businessAddress?: string;
  taxId?: string;
  receiptFooter?: string;
  allowPriceOverride?: boolean;
  googleDriveLinked?: boolean;
  bluetoothPrinterId?: string;
  bluetoothPrinterName?: string;
}