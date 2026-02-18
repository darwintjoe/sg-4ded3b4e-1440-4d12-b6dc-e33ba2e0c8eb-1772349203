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
  assignedShift?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface Item {
  id?: number;
  sku?: string;
  name: string;
  category: string;
  price: number;
  stock?: number;
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
  yearMonth: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface MonthlyPaymentSales {
  id?: number;
  method: PaymentMethod;
  yearMonth: string;
  totalAmount: number;
  transactionCount: number;
}

export interface MonthlySalesSummary {
  id?: number;
  yearMonth: string;
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
  yearMonth: string;
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
  
  // Integrations
  googleDriveLinked: boolean;
  googleAccountEmail?: string; // For verifying Google Drive account
  
  // Features
  allowPriceOverride: boolean; // Allow changing price during checkout
  adminPIN?: string; // Admin PIN for sensitive actions
  bluetoothPrinterId?: string;
  bluetoothPrinterName?: string;
  
  // Shift Management
  shifts: {
    shift1: ShiftConfig;
    shift2: ShiftConfig;
    shift3: ShiftConfig;
  };
  requireClockIn?: boolean;
  trackBreaks?: boolean;
  autoClockOutAtShiftEnd?: boolean;
  allowSelfCorrection?: boolean;

  // Payment Methods
  paymentMethods?: {
    cash?: boolean;
    card?: boolean;
    ewallet?: boolean;
    qr?: boolean;
    transfer?: boolean;
  };
}

export interface ShiftConfig {
  enabled: boolean;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Translations {
  scanner: {
    title: string;
    instruction: string;
    tip: string;
    scanned: string;
    lastScanned: string;
    noCamera: string;
    cameraError: string;
    error: string;
    itemNotFound: string;
    itemAdded: string;
  };
}