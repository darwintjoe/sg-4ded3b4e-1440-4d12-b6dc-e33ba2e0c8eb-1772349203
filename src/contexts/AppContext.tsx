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
import { useToast } from "@/hooks/use-toast";

interface AppContextType {
  mode: POSMode;
  setMode: (mode: POSMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
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
  // Pending new item from barcode scan (shared between POS and Admin)
  pendingNewItemSku: string | null;
  setPendingNewItemSku: (sku: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [mode, setModeState] = useState<POSMode>("retail");
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
  const [pendingNewItemSku, setPendingNewItemSku] = useState<string | null>(null);

  // Derived state for language
  const language: Language = (settings?.language as Language) || "en";

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
      console.log("✅ Settings loaded");

      // Start pinger service with business name
      pingerService.start(loadedSettings.businessName || "");

      // Check for active cashier session
      const activeSession = await db.getById<CashierSession>("cashierSession", 1);
      if (activeSession && activeSession.shiftActive) {
        // Check if session is from a different business date (stale shift)
        const todayBusinessDate = getBusinessDate();
        const sessionDate = await getSessionBusinessDate(activeSession.employeeId);
        
        if (sessionDate && sessionDate !== todayBusinessDate) {
          console.log(`⚠️ Stale shift detected: ${sessionDate} vs today ${todayBusinessDate}`);
          await autoCloseStaleShift(activeSession.employeeId, sessionDate);
          console.log("✅ Stale shift auto-closed");
        } else {
          setHasActiveSession(true);
          console.log("✅ Active session detected");
        }
      }

      // Check for paused state - also verify it's not stale
      const pauseState = await db.getById<PauseState>("pauseState", 1);
      if (pauseState) {
        const todayBusinessDate = getBusinessDate();
        const pauseSessionDate = await getSessionBusinessDate(pauseState.cashierId);
        
        if (pauseSessionDate && pauseSessionDate !== todayBusinessDate) {
          console.log(`⚠️ Stale paused session detected: ${pauseSessionDate}`);
          await autoCloseStaleShift(pauseState.cashierId, pauseSessionDate);
          await db.delete("pauseState", 1);
          console.log("✅ Stale paused session cleared");
        } else {
          setIsPaused(true);
          setCart(pauseState.cart);
          setModeState(pauseState.mode);
          console.log("✅ Paused session restored");
        }
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

  // Helper: Get business date from an active shift for a given employee
  const getSessionBusinessDate = async (employeeId: number): Promise<string | null> => {
    try {
      const shifts = await db.searchByIndex<Shift>("shifts", "cashierId", employeeId);
      const activeShift = shifts.find(s => s.status === "active");
      return activeShift?.businessDate || null;
    } catch (error) {
      console.error("Error getting session business date:", error);
      return null;
    }
  };

  // Helper: Auto-close a stale shift with full post-close processing
  const autoCloseStaleShift = async (employeeId: number, staleDate: string) => {
    try {
      const shifts = await db.searchByIndex<Shift>("shifts", "cashierId", employeeId);
      const activeShift = shifts.find(s => s.status === "active");
      
      if (activeShift) {
        // Close the shift - set shiftEnd to end of that business date (23:59:59)
        const [year, month, day] = staleDate.split("-").map(Number);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
        
        const updatedShift: Shift = {
          ...activeShift,
          shiftEnd: endOfDay,
          status: "closed"
        };
        await db.put("shifts", updatedShift);
        console.log(`✅ Auto-closed stale shift ${activeShift.shiftId}`);

        // Trigger all post-close tasks (same as normal close)
        await performPostCloseActions(updatedShift);
      }
      
      // Clear the cashier session
      await db.delete("cashierSession", 1);
    } catch (error) {
      console.error("Error auto-closing stale shift:", error);
    }
  };

  // Shared post-close actions for both normal and auto-close
  const performPostCloseActions = async (closedShift: Shift) => {
    try {
      // Check if month changed, trigger monthly rollup
      await checkAndRollupMonthly();

      // Trigger backup to Google Drive (fire-and-forget)
      triggerBackupToGoogleDrive();

      // Delete shift after backup initiation (fire-and-forget)
      deleteShiftAfterBackup(closedShift.shiftId).catch(() => {
        // Silent failure - non-critical
      });

      // Send shift report as calendar event (fire-and-forget)
      sendShiftReportToCalendar(closedShift);

      // Export transactions to Google Sheets (fire-and-forget)
      exportTransactionsToSheets(closedShift);
    } catch (error) {
      console.error("Error performing post-close actions:", error);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!settings) return;
    
    const updated: Settings = { ...settings, ...newSettings };
    setSettingsState(updated);
    
    // Sync mode state if mode changed
    if (newSettings.mode) {
      setModeState(newSettings.mode);
    }
    
    // Persist to DB - Settings uses "key" as keyPath, not "id"
    // Always use put() which handles both insert and update
    try {
      await db.put("settings", updated);
      console.log("✅ Settings saved to DB");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
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
        // Check if shift is from today - if not, don't restore (stale shift)
        const todayBusinessDate = getBusinessDate();
        if (activeShift.businessDate !== todayBusinessDate) {
          console.log(`⚠️ Cannot restore stale shift from ${activeShift.businessDate}`);
          await autoCloseStaleShift(employee.id!, activeShift.businessDate);
          return false;
        }
        
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
      const admins = await db.searchByIndex<Employee>("employees", "pin", "000000");
      
      if (admins.length === 0) {
        console.log("Creating default admin...");
        await db.add("employees", {
          name: "Admin",
          pin: "000000",
          role: "admin",
          createdAt: Date.now(),
          isActive: true
        });
      } else {
        console.log("Admin seeding skipped (exists)");
      }

      // Check for Cashier
      const cashiers = await db.searchByIndex<Employee>("employees", "pin", "111111");
      
      if (cashiers.length === 0) {
        console.log("Creating default cashier...");
        await db.add("employees", {
          name: "Cashier 1",
          pin: "111111",
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
    await updateSettings({ mode: newMode });
  };

  const setLanguage = async (lang: Language) => {
    await updateSettings({ language: lang });
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

      // Trigger all post-close actions (shared with auto-close)
      await performPostCloseActions(updatedShift);
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

      // Get business name for the event title
      const businessName = settings?.businessName || "My Store";

      const description = `
━━━━━━━━━━━━━━━━━━━━━━
💰 SALES SUMMARY
━━━━━━━━━━━━━━━━━━━━━━
Store: ${businessName}
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

      // Include business name in event title for multi-store identification
      const eventTitle = `[${businessName}] 💰 ${formatCurrency(totalRevenue)} - ${shift.cashierName}`;

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
        pendingNewItemSku,
        setPendingNewItemSku,
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