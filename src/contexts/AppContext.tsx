import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { POSMode, Employee, CartItem, PauseState, Language, AttendanceRecord, Shift, Transaction, DailyItemSales, DailyPaymentSales, DailyShiftSummary, MonthlyItemSales, MonthlySalesSummary, MonthlyAttendanceSummary, CashierSession, Settings, ShiftTransactions, BackupStatus, GoogleUser } from "@/types";
import { db } from "@/lib/db";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { 
  generateSampleItems, 
  generateSampleEmployees, 
  getDefaultSettings,
  generateSampleStoreData 
} from "@/lib/sample-store-data";
import { sheetsExport } from "@/lib/sheets-export";
import { 
  detectShift, 
  generateShiftId, 
  getBusinessDate,
  deleteShiftAfterBackup
} from "@/lib/shift-service";
import { 
  checkAndRollupMonthly,
  runStartupCleanup
} from "@/lib/data-rollup-service";
import { appLog } from "@/lib/logger";
import { playBeepSound } from "@/lib/utils";
import { pingerService } from "@/lib/pinger-service";

interface AppContextType {
  mode: POSMode;
  setMode: (mode: POSMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  settings: Settings;
  updateSettings: (settings: Settings) => Promise<void>;
  currentUser: Employee | null;
  adminUser: Employee | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<{ success: boolean; message: string }>;
  loginAdmin: (pin: string) => Promise<boolean>;
  loginAdminViaGoogle: (email: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  lockSession: () => Promise<void>;
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
  isInitializing: boolean;
  loadingStatus: string;
  // Google Auth properties
  user: GoogleUser | null;
  isSignedIn: boolean;
  isInitialized: boolean;
  signIn: () => Promise<{ success: boolean; user?: GoogleUser; error?: string }>;
  signOut: () => void;
  createCalendarEvent: (event: any) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  backupStatus: BackupStatus;
  refreshBackupStatus: () => Promise<void>;
  createBackup: () => Promise<{ success: boolean; error?: string }>;
  checkBackupAvailability: () => Promise<{ exists: boolean; info?: any; error?: string }>;
  startRestore: () => Promise<{ success: boolean; backupData?: any; error?: string }>;
  backupCurrentDatabase: () => Promise<{ success: boolean; error?: string }>;
  loadPreview: (backupData: any) => Promise<{ success: boolean; error?: string }>;
  finalizeRestore: (backupData: any) => Promise<{ success: boolean; error?: string }>;
  cancelRestore: () => Promise<{ success: boolean; error?: string }>;
  revertRestore: () => Promise<{ success: boolean; error?: string }>;
  canRevert: () => { available: boolean; expiresAt: number | null; hoursRemaining: number | null };
  promoteCandidate: () => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<POSMode>("retail");
  const [language, setLanguageState] = useState<Language>("en");
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [adminUser, setAdminUser] = useState<Employee | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Initializing system...");
  const [isInitialized, setIsInitialized] = useState(false);

  // Google Auth integration
  const googleAuth = useGoogleAuth();

  // Initialize database and load settings
  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
        
        // Run startup cleanup (replaces old cleanupOldDailyRecords call)
        runStartupCleanup().catch(err => {
          console.error("Startup cleanup failed (non-fatal):", err);
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  // Auto-save cart state whenever it changes
  useEffect(() => {
    if (currentUser && currentShift) {
      saveSessionState();
    }
  }, [cart, currentUser, currentShift]);

  const initializeApp = async () => {
    try {
      console.log("🚀 Initializing app...");
      setIsInitializing(true);
      
      await db.init();
      console.log("✅ Database initialized");
      
      // Get or create settings
      const loadedSettings = await db.getSettings();
      setSettingsState(loadedSettings);
      setModeState(loadedSettings.mode);
      setLanguageState(loadedSettings.language as Language);
      console.log("✅ Settings loaded");

      // Start pinger service with business settings
      if (loadedSettings.businessId) {
        pingerService.start({
          deviceId: loadedSettings.businessId,
          storeName: loadedSettings.businessName || "",
        });
      }

      // Check for active cashier session
      const activeSession = await db.getById<CashierSession>("cashierSession", 1);
      if (activeSession && activeSession.shiftActive) {
        setHasActiveSession(true);
        console.log("✅ Active session detected");
      }

      // Check for paused state
      const pauseState = await db.getById<PauseState>("pauseState", 1);
      if (pauseState) {
        setIsPaused(true);
        setCart(pauseState.cart);
        setModeState(pauseState.mode);
        console.log("✅ Paused session restored");
      }

      // Seed default data (non-blocking)
      await seedDefaultData();
      console.log("✅ Default data seeded");
      
      // Mark initialization as complete
      setIsInitializing(false);
      console.log("✅ App initialization complete");
    } catch (error) {
      console.error("❌ App initialization failed:", error);
      setIsInitializing(false);
      throw error;
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    await db.updateSettings(newSettings);
    setSettingsState(newSettings);
    setModeState(newSettings.mode);
    setLanguageState(newSettings.language as Language);
    
    // Update pinger with new business settings
    pingerService.updateConfig({
      deviceId: newSettings.businessId || "",
      storeName: newSettings.businessName || "",
    });
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

  // Function to seed default data
  const seedDefaultData = async () => {
    try {
      console.log("🌱 Seeding default employees...");
      
      // Check for Admin
      const admins = await db.searchByIndex<Employee>("employees", "pin", "0000");
      
      if (admins.length === 0) {
        console.log("Creating default admin...");
        await db.add("employees", {
          name: "Admin",
          pin: "0000",
          role: "admin",
          createdAt: Date.now(),
          isActive: true
        });
      } else {
        console.log("Admin seeding skipped (exists)");
      }

      // Check for Cashier
      const cashiers = await db.searchByIndex<Employee>("employees", "pin", "1111");
      
      if (cashiers.length === 0) {
        console.log("Creating default cashier...");
        await db.add("employees", {
          name: "Cashier 1",
          pin: "1111",
          role: "cashier",
          createdAt: Date.now(),
          isActive: true
        });
      } else {
        console.log("Cashier seeding skipped (exists)");
      }
      
    } catch (error) {
      console.error("Failed to seed default data:", error);
    }
  };

  // Helper: Clear temp backup data
  const clearTempBackupData = async () => {
    // Legacy cleanup - functionality moved to backupService
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

  const loginAdminViaGoogle = async (email: string): Promise<boolean> => {
    // Verify that the email matches the linked admin email
    if (settings && settings.googleDriveLinked && settings.googleAccountEmail === email) {
      setCurrentUser({
        name: "Admin (Google)",
        role: "admin",
        pin: "GOOGLE", // Placeholder
        createdAt: Date.now()
      });
      return true;
    }
    return false;
  };

  const logoutAdmin = async () => {
    setAdminUser(null);
  };

  const lockSession = async () => {
    if (currentUser && currentShift) {
      await saveSessionState();
    }
    setCurrentUser(null);
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

      // Check if month changed, trigger monthly rollup
      await checkAndRollupMonthly();

      // Trigger backup to Google Drive (fire-and-forget)
      triggerBackupToGoogleDrive();

      // Delete shift after backup initiation (fire-and-forget)
      deleteShiftAfterBackup(updatedShift.shiftId).catch(() => {
        // Silent failure - non-critical
      });

      // Send shift report as calendar event (fire-and-forget)
      sendShiftReportToCalendar(updatedShift);

      // Export transactions to Google Sheets (fire-and-forget)
      exportTransactionsToSheets(updatedShift);
    } catch (error) {
      console.error("Error closing shift:", error);
    }
  };

  const triggerBackupToGoogleDrive = async () => {
    try {
      console.log("Triggering auto-backup...");
      if (googleAuth.isSignedIn) {
        googleAuth.createBackup().then(result => {
          if (result.success) {
            console.log("✅ Auto-backup success");
          } else {
            console.warn("⚠️ Auto-backup failed:", result.error);
          }
        });
      }
    } catch (error) {
      console.error("Auto-backup trigger error:", error);
    }
  };

  const sendShiftReportToCalendar = async (shift: Shift) => {
    try {
      if (!googleAuth.isSignedIn) {
        console.log("Google not linked, skipping calendar event");
        return;
      }

      const shiftTransactions = await db.searchByIndex<Transaction>("transactions", "shiftId", shift.shiftId);
      
      const paymentBreakdown = {
        cash: 0,
        qrisStatic: 0,
        qrisDynamic: 0,
        voucher: 0,
        cashCount: 0,
        qrisStaticCount: 0,
        qrisDynamicCount: 0,
        voucherCount: 0
      };

      let totalRevenue = 0;

      shiftTransactions.forEach((t) => {
        totalRevenue += t.total;
        t.payments.forEach((p) => {
          if (p.method === "cash") {
            paymentBreakdown.cash += p.amount;
            paymentBreakdown.cashCount++;
          } else if (p.method === "qris-static") {
            paymentBreakdown.qrisStatic += p.amount;
            paymentBreakdown.qrisStaticCount++;
          } else if (p.method === "qris-dynamic") {
            paymentBreakdown.qrisDynamic += p.amount;
            paymentBreakdown.qrisDynamicCount++;
          } else if (p.method === "voucher") {
            paymentBreakdown.voucher += p.amount;
            paymentBreakdown.voucherCount++;
          }
        });
      });

      const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString("id-ID")}`;
      };

      const description = `
━━━━━━━━━━━━━━━━━━━━━━
💰 SALES SUMMARY
━━━━━━━━━━━━━━━━━━━━━━
Total Sales: ${formatCurrency(totalRevenue)}
Transactions: ${shiftTransactions.length}

PAYMENT BREAKDOWN:
💵 Cash: ${formatCurrency(paymentBreakdown.cash)} (${paymentBreakdown.cashCount} txn)
📱 QRIS Static: ${formatCurrency(paymentBreakdown.qrisStatic)} (${paymentBreakdown.qrisStaticCount} txn)
📲 QRIS Dynamic: ${formatCurrency(paymentBreakdown.qrisDynamic)} (${paymentBreakdown.qrisDynamicCount} txn)
🎫 Voucher: ${formatCurrency(paymentBreakdown.voucher)} (${paymentBreakdown.voucherCount} txn)

━━━━━━━━━━━━━━━━━━━━━━
👤 Cashier: ${shift.cashierName}
⏰ Shift Duration: ${shift.shiftEnd ? ((shift.shiftEnd - shift.shiftStart) / (1000 * 60 * 60)).toFixed(1) : "0"} hours
📅 Business Date: ${shift.businessDate}
━━━━━━━━━━━━━━━━━━━━━━
`.trim();

      const eventTitle = `💰 ${formatCurrency(totalRevenue)} - ${shift.cashierName} - Shift Closed`;

      const shiftEndTime = shift.shiftEnd || Date.now();
      const eventStart = new Date(shiftEndTime).toISOString();
      const eventEnd = new Date(shiftEndTime + 3600000).toISOString();

      const result = await googleAuth.createCalendarEvent({
        summary: eventTitle,
        description: description,
        start: eventStart,
        end: eventEnd
      });

      if (result.success) {
        console.log("✅ Shift report sent to Google Calendar");
      } else {
        console.error("❌ Failed to send shift report:", result.error);
      }
    } catch (error) {
      console.error("Error sending shift report to calendar:", error);
    }
  };

  const exportTransactionsToSheets = async (shift: Shift) => {
    try {
      if (!googleAuth.isSignedIn) {
        console.log("Google not linked, skipping Sheets export");
        return;
      }

      // Get all transactions for this shift
      const shiftTransactions = await db.searchByIndex<Transaction>("transactions", "shiftId", shift.shiftId);
      
      if (shiftTransactions.length === 0) {
        console.log("No transactions to export to Sheets");
        return;
      }

      // Get business name from settings
      const businessName = settings?.businessName || "My Business";

      // Export to Google Sheets (non-blocking, fire-and-forget)
      const shiftData: ShiftTransactions = {
        shiftId: shift.shiftId,
        employeeId: shift.cashierId,
        employeeName: shift.cashierName,
        shiftStart: shift.shiftStart,
        shiftEnd: shift.shiftEnd || Date.now(),
        transactions: shiftTransactions
      };

      sheetsExport.exportShiftTransactions(
        shiftData,
        shift,
        businessName
      ).then(result => {
        if (result.success) {
          console.log("✅ Transactions exported to Google Sheets");
        } else {
          console.error("❌ Sheets export failed:", result.error);
        }
      }).catch(error => {
        // Silent fail - no blocking
        console.error("❌ Sheets export error:", error);
      });
    } catch (error) {
      console.error("Error exporting to Sheets:", error);
      // Silent fail - don't block logout
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
    
    // Smart shift detection using current settings
    const detectedShift = detectShift(clockInTime, settings);

    // Calculate if late at clock-in time
    let isLate = false;
    let lateMinutes = 0;

    if (detectedShift?.start) {
      const [scheduledHour, scheduledMin] = detectedShift.start.split(":").map(Number);
      const clockInDate = new Date(clockInTime);
      const scheduledStartTime = new Date(clockInDate);
      scheduledStartTime.setHours(scheduledHour, scheduledMin, 0, 0);

      if (clockInTime > scheduledStartTime.getTime()) {
        isLate = true;
        lateMinutes = Math.round((clockInTime - scheduledStartTime.getTime()) / (1000 * 60));
      }
    }

    await db.add("attendance", {
      employeeId: employee.id!,
      employeeName: employee.name,
      clockIn: clockInTime,
      date: today,
      assignedShift: detectedShift?.name,
      scheduledStart: detectedShift?.start,
      scheduledEnd: detectedShift?.end,
      isLate,
      lateMinutes: lateMinutes > 0 ? lateMinutes : undefined
    });

    // Play clock-in beep sound
    playBeepSound("clockIn");

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

    // Update the attendance record with clock out time
    activeRecord.clockOut = clockOutTime;
    await db.put("attendance", activeRecord);

    // Play clock-out beep sound
    playBeepSound("clockOut");

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
        settings: settings!,
        updateSettings,
        currentUser,
        adminUser,
        login,
        logout,
        loginAdmin,
        loginAdminViaGoogle,
        logoutAdmin,
        lockSession,
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
        hasActiveSession,
        isInitializing,
        loadingStatus,
        ...googleAuth
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