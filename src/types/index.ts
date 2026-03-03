export type POSMode = "retail" | "cafe";

export type UserRole = "admin" | "cashier" | "employee";

export type Language = "en" | "id" | "zh" | "th" | "vi" | "my";

export type PaymentMethod = "cash" | "qris-static" | "qris-dynamic" | "card" | "voucher" | "transfer";

// ==========================================
// Core Business Entities
// ==========================================

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
  isLate?: boolean;
  lateMinutes?: number;
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
  tax1: number;
  tax2: number;
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

export interface ShiftTransactions {
  shiftId: string | number;
  employeeId: string | number;
  employeeName: string;
  shiftStart: number;
  shiftEnd: number;
  transactions: Transaction[];
}

// ==========================================
// Daily Aggregates
// ==========================================

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

// ==========================================
// Monthly Aggregates
// ==========================================

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
  totalLateMinutes?: number;
  earlyLeaveCount?: number;
  totalEarlyLeaveMinutes?: number;
}

// ==========================================
// Reports & Analytics
// ==========================================

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

// ==========================================
// Session & State Management
// ==========================================

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

// ==========================================
// Settings & Configuration
// ==========================================

export interface ShiftConfig {
  enabled: boolean;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Settings {
  id?: number;
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
  businessAddress: string;
  businessPhone: string;
  businessTaxId: string;
  taxId?: string;
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
  qrisStaticImage?: string;
  qrisDynamicEndpoint?: string;
  qrisDynamicApiKey?: string;
  qrisDynamicMerchantId?: string;
}

export interface Translations {
  [key: string]: string;
}

// ==========================================
// Google Auth & Backup
// ==========================================

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

export interface BackupStatus {
  lastBackupTime: string | null;
  lastBackupStatus: "success" | "failed" | "pending" | null;
  isHealthy: boolean;
  message: string;
  canBackup?: boolean;
  canRestore: boolean;
  fileSize?: string;
  backupInfo?: {
    timestamp: string;
    size: number;
    itemCount: number;
    employeeCount: number;
    checksumValid: boolean;
  };
}

export interface BackupMetadata {
  version: string;
  timestamp: string;
  deviceId: string;
  dataSize: number;
  checksum: string;
  status: "candidate" | "verified";
  itemCount?: number;
  employeeCount?: number;
}

export interface BackupData {
  metadata: BackupMetadata;
  items: Item[];
  employees: Employee[];
  categories: string[];
  settings: Settings;
  shifts: Shift[];
  dailyItemSales: DailyItemSales[];
  dailyPaymentSales: DailyPaymentSales[];
  attendance: AttendanceRecord[];
  monthlyItemSales: MonthlyItemSales[];
  monthlySalesSummary: MonthlySalesSummary[];
  monthlyAttendanceSummary: MonthlyAttendanceSummary[];
}

// ==========================================
// Chatbot Types
// ==========================================

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
  filters?: Record<string, unknown>;
}

export interface QueryResult {
  type: "text" | "data" | "chart" | "mixed" | "error";
  text: string;
  data?: unknown;
  chartType?: "bar" | "line" | "pie" | "heatmap";
  timeRange?: TimeRange;
  error?: string;
}

// ==========================================
// Sheets Export Types
// ==========================================

export interface TransactionRow {
  receiptNumber: string;
  timestamp: string;
  description: string;
  tax1: number;
  tax2: number;
  total: number;
  paymentMethod: "cash" | "qris" | "transfer" | string;
  cashAmount: number;
  qrisAmount: number;
  transferAmount: number;
}

// ==========================================
// Accurate.id Integration Types
// ==========================================

export interface AccurateCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  databaseId?: string;
  hostUrl?: string;
}

export interface AccurateConnectionStatus {
  connected: boolean;
  lastSyncTime?: string;
  companyName?: string;
  databaseName?: string;
  error?: string;
}

export interface AccurateSyncQueueItem {
  id?: number;
  type: "sales_invoice" | "item" | "customer" | "payment";
  action: "create" | "update" | "delete";
  localId: number | string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "success" | "failed";
  attempts: number;
  lastAttempt?: number;
  errorMessage?: string;
  createdAt: number;
}

export interface AccurateItemMapping {
  localItemId: number;
  accurateItemId: number;
  accurateItemNo: string;
  lastSyncedAt: number;
}

export interface AccurateSalesInvoice {
  transactionNo: string;
  transDate: string;
  customerNo?: string;
  branchName?: string;
  description?: string;
  detailItem: AccurateSalesInvoiceDetail[];
}

export interface AccurateSalesInvoiceDetail {
  itemNo: string;
  quantity: number;
  unitPrice: number;
  itemDescription?: string;
}