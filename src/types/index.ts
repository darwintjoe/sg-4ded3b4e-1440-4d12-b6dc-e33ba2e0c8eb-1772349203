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
  cashierId: number;
  cashierName: string;
  mode: POSMode;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payments: PaymentRecord[]; // Changed from single paymentMethod to array
  change?: number;
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
}

export type Settings = AppSettings;