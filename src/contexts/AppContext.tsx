import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { POSMode, Employee, CartItem, PauseState, Language, AttendanceRecord, Shift, Transaction, DailyItemSales, DailyPaymentSales, DailyShiftSummary, MonthlyItemSales, MonthlySalesSummary, MonthlyAttendanceSummary, CashierSession } from "@/types";
import { db } from "@/lib/db";

interface AppContextType {
  mode: POSMode;
  setMode: (mode: POSMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser: Employee | null;
  adminUser: Employee | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<{ success: boolean; message: string }>;
  loginAdmin: (pin: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
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
  currentShift: Shift | null;
  hasActiveSession: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<POSMode>("retail");
  const [language, setLanguageState] = useState<Language>("en");
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [adminUser, setAdminUser] = useState<Employee | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  // Auto-save cart state whenever it changes
  useEffect(() => {
    if (currentUser && currentShift) {
      saveSessionState();
    }
  }, [cart, currentUser, currentShift]);

  const initializeApp = async () => {
    await db.init();
    
    // Get or create settings
    const settings = await db.getSettings();
    setModeState(settings.mode);
    setLanguageState(settings.language as Language);

    // Check for active cashier session
    const activeSession = await db.getById<CashierSession>("cashierSession", 1);
    if (activeSession && activeSession.shiftActive) {
      setHasActiveSession(true);
      // Don't auto-login, require relogin for security
      // But preserve the session data for restoration
    }

    const pauseState = await db.getById<PauseState>("pauseState", 1);
    if (pauseState) {
      setIsPaused(true);
      setCart(pauseState.cart);
      setModeState(pauseState.mode);
    }

    await seedDefaultData();
  };

  const saveSessionState = async () => {
    if (!currentUser || !currentShift) return;

    try {
      const session: CashierSession = {
        id: 1,
        employeeId: currentUser.id!,
        employeeName: currentUser.name,
        role: currentUser.role,
        loginTime: currentShift.shiftStart,
        lastActivity: Date.now(),
        cartState: cart,
        shiftActive: true,
        mode
      };
      await db.put("cashierSession", session);
    } catch (error) {
      console.error("Error saving session state:", error);
    }
  };

  const restoreSessionState = async (employee: Employee): Promise<boolean> => {
    try {
      const session = await db.getById<CashierSession>("cashierSession", 1);
      if (!session || !session.shiftActive) return false;
      if (session.employeeId !== employee.id) return false;

      // Restore shift
      const shifts = await db.searchByIndex<Shift>("shifts", "cashierId", employee.id!);
      const activeShift = shifts.find(s => s.status === "active");
      
      if (activeShift) {
        setCurrentShift(activeShift);
        setCart(session.cartState);
        setModeState(session.mode);
        setHasActiveSession(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error restoring session:", error);
      return false;
    }
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
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  };

  const setMode = async (newMode: POSMode) => {
    setModeState(newMode);
    const settings = await db.getSettings();
    settings.mode = newMode;
    await db.updateSettings(settings);
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    const settings = await db.getSettings();
    settings.language = lang;
    await db.updateSettings(settings);
  };

  const getBusinessDate = (): string => {
    return new Date().toISOString().split("T")[0];
  };

  const generateShiftId = async (businessDate: string): Promise<string> => {
    const existingShifts = await db.searchByIndex<Shift>("shifts", "businessDate", businessDate);
    const shiftNumber = existingShifts.length + 1;
    return `${businessDate}-shift-${shiftNumber}`;
  };

  const login = async (pin: string): Promise<boolean> => {
    const employees = await db.getAll<Employee>("employees");
    const user = employees.find(emp => emp.pin === pin && emp.role === "cashier");
    
    if (user) {
      // Check if there's an active session to restore
      const restored = await restoreSessionState(user);
      if (restored) {
        setCurrentUser(user);
        return true;
      }

      // No session to restore, create new shift
      const businessDate = getBusinessDate();
      const calendarDayStart = new Date().toISOString().split("T")[0];
      const shiftId = await generateShiftId(businessDate);
      
      const newShift: Shift = {
        shiftId,
        businessDate,
        cashierId: user.id!,
        cashierName: user.name,
        shiftStart: Date.now(),
        calendarDayStart,
        status: "active"
      };
      
      await db.add("shifts", newShift);
      setCurrentUser(user);
      setCurrentShift(newShift);
      
      // Create session
      const session: CashierSession = {
        id: 1,
        employeeId: user.id!,
        employeeName: user.name,
        role: user.role,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        cartState: [],
        shiftActive: true,
        mode
      };
      await db.put("cashierSession", session);
      setHasActiveSession(false);
      
      return true;
    }
    return false;
  };

  const loginAdmin = async (pin: string): Promise<boolean> => {
    const employees = await db.getAll<Employee>("employees");
    const admin = employees.find(emp => emp.pin === pin && emp.role === "admin");
    
    if (admin) {
      setAdminUser(admin);
      return true;
    }
    return false;
  };

  const logoutAdmin = async () => {
    setAdminUser(null);
  };

  const logout = async (): Promise<{ success: boolean; message: string }> => {
    // Validation: Cannot logout with items in cart
    if (cart.length > 0) {
      return {
        success: false,
        message: "pos.logoutWithCartError"
      };
    }

    if (currentUser?.role === "cashier" && currentShift) {
      await closeShiftAndGenerateSummaries();
    }

    // Clear session
    try {
      await db.delete("cashierSession", 1);
    } catch (e) {
      console.error("Error clearing session:", e);
    }

    setCurrentUser(null);
    setCurrentShift(null);
    setHasActiveSession(false);
    clearCart();
    
    return {
      success: true,
      message: "pos.logoutSuccess"
    };
  };

  const closeShiftAndGenerateSummaries = async () => {
    if (!currentUser || !currentShift) return;

    try {
      const shiftEnd = Date.now();
      
      // Close shift
      const updatedShift: Shift = {
        ...currentShift,
        shiftEnd,
        status: "closed"
      };
      await db.put("shifts", updatedShift);

      // Generate daily shift summary
      await generateDailyShiftSummary(updatedShift);

      // Check if month changed, trigger monthly rollup
      await checkAndRollupMonthly();

      // Move cold data (older than 7 business days)
      await archiveColdData();

      // Trigger backup to Google Drive (fire-and-forget)
      triggerBackupToGoogleDrive();

      // Send shift report as calendar event (fire-and-forget)
      sendShiftReportToCalendar(updatedShift);
    } catch (error) {
      console.error("Error closing shift:", error);
    }
  };

  const generateDailyShiftSummary = async (shift: Shift) => {
    try {
      const shiftTransactions = await db.searchByIndex<Transaction>("transactions", "shiftId", shift.shiftId);

      const paymentBreakdown = {
        cash: 0,
        qrisStatic: 0,
        qrisDynamic: 0,
        voucher: 0
      };

      let totalRevenue = 0;

      shiftTransactions.forEach((t) => {
        totalRevenue += t.total;
        t.payments.forEach((p) => {
          if (p.method === "cash") paymentBreakdown.cash += p.amount;
          else if (p.method === "qris-static") paymentBreakdown.qrisStatic += p.amount;
          else if (p.method === "qris-dynamic") paymentBreakdown.qrisDynamic += p.amount;
          else if (p.method === "voucher") paymentBreakdown.voucher += p.amount;
        });
      });

      const hoursWorked = shift.shiftEnd ? (shift.shiftEnd - shift.shiftStart) / (1000 * 60 * 60) : 0;

      const summary: DailyShiftSummary = {
        shiftId: shift.shiftId,
        businessDate: shift.businessDate,
        cashierId: shift.cashierId,
        cashierName: shift.cashierName,
        totalRevenue,
        totalReceipts: shiftTransactions.length,
        paymentBreakdown,
        hoursWorked
      };

      await db.add("dailyShiftSummary", summary);
    } catch (error) {
      console.error("Error generating daily shift summary:", error);
    }
  };

  const checkAndRollupMonthly = async () => {
    try {
      const today = getBusinessDate();
      const currentMonth = today.substring(0, 7); // YYYY-MM

      const settings = await db.getSettings();
      const lastMonth = (settings as any).lastMonthlyRollup;

      if (lastMonth && lastMonth !== currentMonth) {
        // Month changed, rollup previous month
        await rollupMonthlyData(lastMonth);
      }

      // Update last rollup date
      const updatedSettings = { ...settings, lastMonthlyRollup: currentMonth } as any;
      await db.updateSettings(updatedSettings);
    } catch (error) {
      console.error("Error checking monthly rollup:", error);
    }
  };

  const rollupMonthlyData = async (month: string) => {
    try {
      // Rollup item sales
      const dailyItems = await db.getAll<DailyItemSales>("dailyItemSales");
      const monthlyItemsMap = new Map<number, { quantity: number; revenue: number; count: number; sku: string; name: string }>();

      dailyItems.forEach((item) => {
        if (item.businessDate.startsWith(month)) {
          const existing = monthlyItemsMap.get(item.itemId) || { quantity: 0, revenue: 0, count: 0, sku: item.sku, name: item.itemName };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.count += item.transactionCount;
          monthlyItemsMap.set(item.itemId, existing);
        }
      });

      for (const [itemId, data] of monthlyItemsMap.entries()) {
        const monthlyItem: MonthlyItemSales = {
          itemId,
          sku: data.sku,
          itemName: data.name,
          month,
          totalQuantity: data.quantity,
          totalRevenue: data.revenue,
          transactionCount: data.count
        };
        await db.upsert("monthlyItemSales", ["month", "itemId"], monthlyItem);
      }

      // Rollup sales summary
      const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      let totalRevenue = 0;
      let totalReceipts = 0;
      const paymentTotals = { cash: 0, qrisStatic: 0, qrisDynamic: 0, voucher: 0 };

      dailyPayments.forEach((payment) => {
        if (payment.businessDate.startsWith(month)) {
          totalRevenue += payment.totalAmount;
          totalReceipts += payment.transactionCount;
          
          if (payment.method === "cash") paymentTotals.cash += payment.totalAmount;
          else if (payment.method === "qris-static") paymentTotals.qrisStatic += payment.totalAmount;
          else if (payment.method === "qris-dynamic") paymentTotals.qrisDynamic += payment.totalAmount;
          else if (payment.method === "voucher") paymentTotals.voucher += payment.totalAmount;
        }
      });

      const monthlySummary: MonthlySalesSummary = {
        month,
        totalRevenue,
        totalReceipts,
        cashAmount: paymentTotals.cash,
        qrisStaticAmount: paymentTotals.qrisStatic,
        qrisDynamicAmount: paymentTotals.qrisDynamic,
        voucherAmount: paymentTotals.voucher
      };
      await db.upsert("monthlySalesSummary", ["month"], monthlySummary);

      // Rollup attendance
      const attendance = await db.getAll<AttendanceRecord>("attendance");
      const monthlyAttendanceMap = new Map<number, { hours: number; days: number; late: number; name: string }>();

      attendance.forEach((record) => {
        if (record.date.startsWith(month) && record.clockOut) {
          const hours = (record.clockOut - record.clockIn) / (1000 * 60 * 60);
          const existing = monthlyAttendanceMap.get(record.employeeId) || { hours: 0, days: 0, late: 0, name: record.employeeName };
          existing.hours += hours;
          existing.days += 1;
          // TODO: Calculate late based on shift start time from settings
          monthlyAttendanceMap.set(record.employeeId, existing);
        }
      });

      for (const [employeeId, data] of monthlyAttendanceMap.entries()) {
        const monthlyAttendance: MonthlyAttendanceSummary = {
          employeeId,
          employeeName: data.name,
          month,
          totalHours: data.hours,
          daysWorked: data.days,
          lateCount: data.late
        };
        await db.upsert("monthlyAttendanceSummary", ["month", "employeeId"], monthlyAttendance);
      }

      console.log(`Monthly rollup completed for ${month}`);
    } catch (error) {
      console.error("Error rolling up monthly data:", error);
    }
  };

  const archiveColdData = async () => {
    try {
      const today = getBusinessDate();
      const cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      const cutoffString = cutoffDate.toISOString().split("T")[0];

      // TODO: Implement proper archive logic with date filtering
      console.log(`Archive triggered for transactions older than ${cutoffString}`);
    } catch (error) {
      console.error("Error archiving cold data:", error);
    }
  };

  const triggerBackupToGoogleDrive = async () => {
    try {
      console.log("Google Drive backup triggered (fire-and-forget)");
      // TODO: Implement actual Google Drive backup
      // Include: master data, all summaries, hot transactions only
    } catch (error) {
      // Silent fail
    }
  };

  const sendShiftReportToCalendar = async (shift: Shift) => {
    try {
      console.log("Calendar event triggered (fire-and-forget)");
      console.log("Shift:", shift);
      // TODO: Implement Google Calendar event push
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

    const clockInTime = Date.now();

    await db.add("attendance", {
      employeeId: employee.id!,
      employeeName: employee.name,
      clockIn: clockInTime,
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

    const clockOutTime = Date.now();
    const hoursWorked = (clockOutTime - activeRecord.clockIn) / (1000 * 60 * 60);

    activeRecord.clockOut = clockOutTime;
    await db.put("attendance", activeRecord);

    // Update dailyAttendance summary (upsert pattern)
    const dailyAttendance: any = {
      employeeId: employee.id!,
      employeeName: employee.name,
      date: today,
      clockIn: activeRecord.clockIn,
      clockOut: clockOutTime,
      hoursWorked,
      isLate: false // TODO: Compare with shift start time from settings
    };

    await db.upsert("dailyAttendance", ["date", "employeeId"], dailyAttendance);

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

    await db.put("pauseState", pauseState);
    setIsPaused(true);
  };

  const resumeSession = async (pin: string): Promise<boolean> => {
    const pauseState = await db.getById<PauseState>("pauseState", 1);
    if (!pauseState) return false;

    const employees = await db.getAll<Employee>("employees");
    const user = employees.find(emp => emp.id === pauseState.cashierId && emp.pin === pin);
    
    if (user) {
      // Restore shift
      const shifts = await db.searchByIndex<Shift>("shifts", "cashierId", user.id!);
      const activeShift = shifts.find(s => s.status === "active");
      
      setCurrentUser(user);
      setCart(pauseState.cart);
      setModeState(pauseState.mode);
      setIsPaused(false);
      setCurrentShift(activeShift || null);
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
        adminUser,
        login,
        logout,
        loginAdmin,
        logoutAdmin,
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
        currentShift,
        hasActiveSession
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