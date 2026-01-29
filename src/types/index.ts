export type POSMode = "retail" | "cafe";

export type UserRole = "admin" | "cashier" | "employee";

export interface Employee {
  id?: number;
  name: string;
  pin: string;
  role: UserRole;
  createdAt: number;
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
  paymentMethod: string;
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
}