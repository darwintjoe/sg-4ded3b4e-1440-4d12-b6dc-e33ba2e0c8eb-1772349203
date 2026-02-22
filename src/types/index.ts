export type POSMode = "retail" | "cafe";

export type UserRole = "admin" | "cashier" | "employee";

export type Language = "en" | "id" | "zh";

export type PaymentMethod = "cash" | "qris-static" | "qris-dynamic" | "card" | "voucher" | "transfer";

export interface Employee {
  id: string;
  name: string;
  code: string;
  role: "admin" | "cashier" | "employee";
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
  receiptLogoBase64?: string;
  businessAddress?: string;
  taxId?: string;
  businessTaxId?: string;
  receiptFooter?: string;
  
  // Integrations
  googleDriveLinked: boolean;
  googleAccountEmail?: string;
  
  // Features
  allowPriceOverride: boolean;
  adminPIN?: string;
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
    qrisStatic?: boolean;
    qrisDynamic?: boolean;
    card?: boolean;
    voucher?: boolean;
    transfer?: boolean;
  };
  
  // Display Settings
  alwaysOnDisplay?: boolean;
  theme?: "light" | "dark" | "system";
  
  // QRIS Configuration
  qrisStaticImage?: string; // Base64 encoded QR code image
  qrisDynamicEndpoint?: string; // API endpoint for generating dynamic QR
  qrisDynamicApiKey?: string; // API key for authentication
  qrisDynamicMerchantId?: string; // Merchant ID
}

export interface ShiftConfig {
  enabled: boolean;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Translations {
  [key: string]: string;
}

// Chatbot Types
export type QueryIntent = 
  | "revenue" 
  | "transactions" 
  | "transaction_history"
  | "transaction_detail"
  | "top_items" 
  | "bottom_items"
  | "item_performance"
  | "category_analysis"
  | "employee_performance"
  | "attendance"
  | "payment_method"
  | "trends"
  | "peak_hours"
  | "comparison"
  | "polite_response"
  | "help"
  | "out_of_context"
  | "unknown";

export type ComparisonType = "day_over_day" | "week_over_week" | "month_over_month" | "period_comparison";

export interface TimeRange {
  type: "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "last_n_days" | "custom" | "all_time";
  days?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ParsedQuery {
  intent: QueryIntent;
  originalInput?: string;
  timeRange: TimeRange;
  compareTimeRange?: TimeRange;
  comparison?: ComparisonType;
  entity?: string;
  limit?: number;
  filters?: Record<string, any>;
}

export interface QueryResult {
  type: "text" | "data" | "chart" | "mixed" | "error";
  text: string;
  data?: any;
  chartType?: "bar" | "line" | "pie" | "heatmap";
  timeRange?: TimeRange;
  error?: string;
}

export interface ShiftTransactions {
  shiftId: string;
  cashierName: string;
  shiftStart: number;
  shiftEnd: number;
  transactions: Transaction[];
}

export interface BackupData {
  employees: Employee[];
  attendance: Attendance[];
  items: Item[];
  transactions: Transaction[];
  shifts: Shift[];
  settings: Settings;
  cashbackAmount?: number;
  version?: number;
  timestamp?: number;
  businessId?: string;
  checksum?: string;
  categories?: any[];
  expenses?: any[];
}