import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { POSMode, Employee, CartItem, PauseState, Language, AttendanceRecord, ShiftReport } from "@/types";
import { db } from "@/lib/db";

interface AppContextType {
  mode: POSMode;
  setMode: (mode: POSMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
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
  clockIn: (pin: string) => Promise<{ success: boolean; message: string }>;
  clockOut: (pin: string) => Promise<{ success: boolean; message: string }>;
  shiftStart: number | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<POSMode>("retail");
  const [language, setLanguageState] = useState<Language>("en");
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shiftStart, setShiftStart] = useState<number | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await db.init();
    
    const settings = await db.getById<{ key: string; mode: POSMode; language: Language }>("settings", "mode");
    if (settings) {
      setModeState(settings.mode);
      if (settings.language) {
        setLanguageState(settings.language);
      }
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
    try {
      const admins = await db.searchByIndex<Employee>("employees", "pin", "0000");
      
      if (admins.length === 0) {
        try {
          await db.add("employees", {
            name: "Admin",
            pin: "0000",
            role: "admin",
            createdAt: Date.now()
          });
        } catch (e) {
          console.log("Admin seeding skipped (exists)");
        }
      }

      const cashiers = await db.searchByIndex<Employee>("employees", "pin", "1111");
      if (cashiers.length === 0) {
        try {
          await db.add("employees", {
            name: "Cashier 1",
            pin: "1111",
            role: "cashier",
            createdAt: Date.now()
          });
        } catch (e) {
          console.log("Cashier seeding skipped (exists)");
        }
      }

      // Seed default language setting
      const langSetting = await db.getById<{ key: string; language: Language }>("settings", "language");
      if (!langSetting) {
        await db.add("settings", { key: "language", language: "en" });
      }
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  };

  const setMode = async (newMode: POSMode) => {
    setModeState(newMode);
    await db.update("settings", { key: "mode", mode: newMode });
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await db.update("settings", { key: "language", language: lang });
  };

  const login = async (pin: string): Promise<boolean> => {
    const employees = await db.getAll<Employee>("employees");
    const user = employees.find(emp => emp.pin === pin);
    
    if (user) {
      setCurrentUser(user);
      if (user.role === "cashier") {
        setShiftStart(Date.now());
      }
      return true;
    }
    return false;
  };

  const logout = async () => {
    if (currentUser?.role === "cashier" && shiftStart) {
      await generateShiftReportAndBackup();
    }
    setCurrentUser(null);
    setShiftStart(null);
    clearCart();
  };

  const generateShiftReportAndBackup = async () => {
    if (!currentUser || !shiftStart) return;

    try {
      const shiftEnd = Date.now();
      const transactions = await db.searchByIndex<any>(
        "transactions",
        "cashierId",
        currentUser.id!
      );

      const shiftTransactions = transactions.filter(
        (t: any) => t.timestamp >= shiftStart && t.timestamp <= shiftEnd
      );

      const paymentBreakdown = {
        cash: 0,
        qrisStatic: 0,
        qrisDynamic: 0,
        voucher: 0
      };

      let totalAmount = 0;

      shiftTransactions.forEach((t: any) => {
        totalAmount += t.total;
        if (t.payments && Array.isArray(t.payments)) {
          t.payments.forEach((p: any) => {
            if (p.method === "cash") paymentBreakdown.cash += p.amount;
            else if (p.method === "qris-static") paymentBreakdown.qrisStatic += p.amount;
            else if (p.method === "qris-dynamic") paymentBreakdown.qrisDynamic += p.amount;
            else if (p.method === "voucher") paymentBreakdown.voucher += p.amount;
          });
        }
      });

      const shiftReport: ShiftReport = {
        cashierId: currentUser.id!,
        cashierName: currentUser.name,
        shiftStart,
        shiftEnd,
        totalReceipts: shiftTransactions.length,
        totalAmount,
        paymentBreakdown
      };

      console.log("Shift Report Generated:", shiftReport);
      triggerBackupAndCalendarEvent(shiftReport);
    } catch (error) {
      console.error("Error generating shift report:", error);
    }
  };

  const triggerBackupAndCalendarEvent = async (report: ShiftReport) => {
    try {
      console.log("Backup + Calendar Event triggered (fire-and-forget)");
      console.log("Report:", report);
      // TODO: Implement Google Drive backup and Calendar event push
    } catch (error) {
      // Silent fail
    }
  };

  const clockIn = async (pin: string): Promise<{ success: boolean; message: string }> => {
    const employees = await db.getAll<Employee>("employees");
    const employee = employees.find(emp => emp.pin === pin);
    
    if (!employee) {
      return { success: false, message: "login.invalid" };
    }

    const today = new Date().toISOString().split("T")[0];
    const todayRecords = await db.searchByIndex<AttendanceRecord>("attendance", "date", today);
    const existingRecord = todayRecords.find(r => r.employeeId === employee.id && !r.clockOut);

    if (existingRecord) {
      return { success: false, message: "attendance.alreadyClockedIn" };
    }

    await db.add("attendance", {
      employeeId: employee.id!,
      employeeName: employee.name,
      clockIn: Date.now(),
      date: today
    });

    return { success: true, message: "attendance.clockedIn" };
  };

  const clockOut = async (pin: string): Promise<{ success: boolean; message: string }> => {
    const employees = await db.getAll<Employee>("employees");
    const employee = employees.find(emp => emp.pin === pin);
    
    if (!employee) {
      return { success: false, message: "login.invalid" };
    }

    const today = new Date().toISOString().split("T")[0];
    const todayRecords = await db.searchByIndex<AttendanceRecord>("attendance", "date", today);
    const activeRecord = todayRecords.find(r => r.employeeId === employee.id && !r.clockOut);

    if (!activeRecord) {
      return { success: false, message: "attendance.notClockedIn" };
    }

    activeRecord.clockOut = Date.now();
    await db.update("attendance", activeRecord);

    return { success: true, message: "attendance.clockedOut" };
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
      setShiftStart(pauseState.timestamp);
      await db.delete("pauseState", 1);
      return true;
    }
    return false;
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
        language,
        setLanguage,
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
        cartTotal,
        clockIn,
        clockOut,
        shiftStart
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