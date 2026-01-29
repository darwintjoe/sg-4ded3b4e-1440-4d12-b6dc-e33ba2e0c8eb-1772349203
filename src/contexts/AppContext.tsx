import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { POSMode, Employee, CartItem, PauseState } from "@/types";
import { db } from "@/lib/db";

interface AppContextType {
  mode: POSMode;
  setMode: (mode: POSMode) => void;
  currentUser: Employee | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isPaused: boolean;
  pauseSession: () => Promise<void>;
  resumeSession: (pin: string) => Promise<boolean>;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<POSMode>("retail");
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await db.init();
    
    const settings = await db.getById<{ key: string; mode: POSMode }>("settings", "mode");
    if (settings) {
      setModeState(settings.mode);
    }

    const pauseState = await db.getById<PauseState>("pauseState", 1);
    if (pauseState) {
      setIsPaused(true);
      setCart(pauseState.cart);
      setModeState(pauseState.mode);
    }

    await seedDefaultData();
  };

  const seedDefaultData = async () => {
    const employees = await db.getAll<Employee>("employees");
    if (employees.length === 0) {
      await db.add("employees", {
        name: "Admin",
        pin: "0000",
        role: "admin",
        createdAt: Date.now()
      });
      await db.add("employees", {
        name: "Cashier 1",
        pin: "1111",
        role: "cashier",
        createdAt: Date.now()
      });
    }
  };

  const setMode = async (newMode: POSMode) => {
    setModeState(newMode);
    await db.update("settings", { key: "mode", mode: newMode });
  };

  const login = async (pin: string): Promise<boolean> => {
    const employees = await db.getAll<Employee>("employees");
    const user = employees.find(emp => emp.pin === pin);
    
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = async () => {
    if (currentUser?.role === "cashier") {
      triggerBackup();
    }
    setCurrentUser(null);
    clearCart();
  };

  const pauseSession = async () => {
    if (!currentUser || currentUser.role !== "cashier") return;

    const pauseState: PauseState = {
      id: 1,
      cashierId: currentUser.id!,
      cart,
      timestamp: Date.now(),
      mode
    };

    await db.update("pauseState", pauseState);
    setIsPaused(true);
  };

  const resumeSession = async (pin: string): Promise<boolean> => {
    const pauseState = await db.getById<PauseState>("pauseState", 1);
    if (!pauseState) return false;

    const employees = await db.getAll<Employee>("employees");
    const user = employees.find(emp => emp.id === pauseState.cashierId && emp.pin === pin);
    
    if (user) {
      setCurrentUser(user);
      setCart(pauseState.cart);
      setModeState(pauseState.mode);
      setIsPaused(false);
      await db.delete("pauseState", 1);
      return true;
    }
    return false;
  };

  const triggerBackup = async () => {
    try {
      console.log("Backup triggered (fire-and-forget)");
    } catch (error) {
      // Silent fail
    }
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        currentUser,
        login,
        logout,
        isPaused,
        pauseSession,
        resumeSession,
        cart,
        setCart,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}