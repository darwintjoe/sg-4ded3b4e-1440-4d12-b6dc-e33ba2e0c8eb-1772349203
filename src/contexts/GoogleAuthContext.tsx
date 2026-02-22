import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { googleAuth } from "@/lib/google-auth";
import { backupService } from "@/lib/backup-service";
import { db } from "@/lib/db";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

interface BackupStatus {
  lastBackupTime: string | null;
  lastBackupStatus: "success" | "failed" | "pending" | null;
  isHealthy: boolean;
  message: string;
  canRestore: boolean;
  backupInfo?: {
    timestamp: string;
    size: number;
    itemCount: number;
    employeeCount: number;
    checksumValid: boolean;
  };
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isSignedIn: boolean;
  isInitialized: boolean;
  signIn: () => Promise<{ success: boolean; user?: GoogleUser; error?: string }>;
  signOut: () => void;
  createCalendarEvent: (event: any) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  // Backup methods
  backupStatus: BackupStatus;
  refreshBackupStatus: () => Promise<void>;
  createBackup: () => Promise<{ success: boolean; error?: string }>;
  checkBackupAvailability: () => Promise<{ exists: boolean; info?: any; error?: string }>;
  startRestore: () => Promise<{ success: boolean; backupData?: any; error?: string }>;
  backupCurrentDatabase: () => Promise<{ success: boolean; error?: string }>;
  loadPreview: (backupData: any) => Promise<{ success: boolean; error?: string }>;
  finalizeRestore: () => Promise<{ success: boolean; error?: string }>;
  cancelRestore: () => Promise<{ success: boolean; error?: string }>;
  revertRestore: () => Promise<{ success: boolean; error?: string }>;
  canRevert: () => { available: boolean; expiresAt: number | null; hoursRemaining: number | null };
  promoteCandidate: () => Promise<{ success: boolean; error?: string }>;
  getStoredBackup: () => any;
  clearStoredBackup: () => Promise<{ success: boolean }>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    lastBackupTime: null,
    lastBackupStatus: null,
    isHealthy: false,
    message: "Initializing...",
    canRestore: false
  });

  useEffect(() => {
    const init = async () => {
      await googleAuth.initialize();
      const currentUser = googleAuth.getCurrentUser();
      
      setUser(currentUser);
      setIsInitialized(true);
      
      if (currentUser) {
        await refreshBackupStatus();
      }
    };

    init();
  }, []);

  // Check backup status periodically
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      
      try {
        const status = await backupService.getBackupStatus();
        setBackupStatus(status);
      } catch (error) {
        console.warn("Backup status check skipped:", error);
      }
    };

    if (user) {
      const timeoutId = setTimeout(checkStatus, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [user]);

  // Track operational time and promote candidate when ready
  useEffect(() => {
    const trackOperationalTime = async () => {
      const candidateTime = localStorage.getItem("candidate_created_at");
      const status = localStorage.getItem("last_backup_status");
      
      if (!candidateTime || status !== "pending") {
        return;
      }
      
      const isOperational = await checkIfOperational();
      
      if (!isOperational) {
        localStorage.setItem("candidate_last_check", Date.now().toString());
        return;
      }
      
      const lastCheck = parseInt(localStorage.getItem("candidate_last_check") || Date.now().toString());
      const now = Date.now();
      const elapsedMinutes = Math.floor((now - lastCheck) / 60000);
      
      const currentHours = parseFloat(localStorage.getItem("candidate_operational_hours") || "0");
      const newHours = currentHours + (elapsedMinutes / 60);
      
      localStorage.setItem("candidate_operational_hours", newHours.toString());
      localStorage.setItem("candidate_last_check", now.toString());
      
      if (newHours >= 2.0) {
        const isHealthy = await validateSystemHealth();
        
        if (isHealthy) {
          await promoteCandidate();
        } else {
          console.warn("System not healthy, keeping candidate pending");
        }
      }
    };
    
    const interval = setInterval(trackOperationalTime, 15 * 60 * 1000);
    trackOperationalTime();
    
    return () => clearInterval(interval);
  }, [user]);

  const checkIfOperational = async (): Promise<boolean> => {
    try {
      const allShifts = await db.getAll("shifts");
      const activeShift = allShifts.find((s: any) => s.status === "active");
      
      if (activeShift) {
        return true;
      }
      
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      const allTransactions = await db.getAll("transactions");
      const recentTransactions = allTransactions.filter(
        (t: any) => t.timestamp >= thirtyMinutesAgo
      );
      
      return recentTransactions.length > 0;
    } catch (error) {
      console.error("Failed to check operational status:", error);
      return false;
    }
  };

  const validateSystemHealth = async (): Promise<boolean> => {
    try {
      const items = await db.getAll("items");
      const employees = await db.getAll("employees");
      const settings = await db.getById("settings", 1);

      return !!(items && employees && settings);
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  };

  const refreshBackupStatus = async () => {
    const status = await backupService.getBackupStatus();
    setBackupStatus(status);
  };

  const signIn = async () => {
    const result = await googleAuth.signIn();
    if (result.success && result.user) {
      setUser(result.user);
      await refreshBackupStatus();
    }
    return { success: result.success, user: result.user, error: result.error };
  };

  const signOut = () => {
    googleAuth.signOut();
    setUser(null);
    setBackupStatus(prev => ({ ...prev, canRestore: false, message: "Not signed in" }));
  };

  const createBackup = async () => {
    const result = await backupService.createBackup();
    await refreshBackupStatus();
    
    if (result.success) {
      localStorage.setItem("candidate_created_at", Date.now().toString());
      localStorage.setItem("candidate_operational_hours", "0");
      localStorage.setItem("candidate_last_check", Date.now().toString());
    }
    
    return result;
  };

  const checkBackupAvailability = async () => {
    return backupService.checkBackupAvailability();
  };

  const startRestore = async () => {
    return backupService.startRestore();
  };

  const backupCurrentDatabase = async () => {
    return backupService.backupCurrentDatabase();
  };

  const loadPreview = async (backupData: any) => {
    return backupService.loadPreview(backupData);
  };

  const finalizeRestore = async () => {
    const result = await backupService.finalizeRestore();
    await refreshBackupStatus();
    return result;
  };

  const cancelRestore = async () => {
    return backupService.cancelRestore();
  };

  const getStoredBackup = () => {
    return backupService.getStoredBackup();
  };

  const clearStoredBackup = () => {
    backupService.clearStoredBackup();
    return Promise.resolve({ success: true });
  };

  const promoteCandidate = async () => {
    return backupService.promoteCandidate();
  };

  const revertRestore = async () => {
    const result = await backupService.revertRestore();
    await refreshBackupStatus();
    return result;
  };

  const canRevert = () => {
    return backupService.canRevert();
  };

  const createCalendarEvent = async (event: any) => {
    return googleAuth.createCalendarEvent(event);
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isSignedIn: user !== null,
        isInitialized,
        signIn,
        signOut,
        createCalendarEvent,
        backupStatus,
        refreshBackupStatus,
        createBackup,
        checkBackupAvailability,
        startRestore,
        backupCurrentDatabase,
        loadPreview,
        finalizeRestore,
        cancelRestore,
        revertRestore,
        canRevert,
        promoteCandidate,
        getStoredBackup,
        clearStoredBackup
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error("useGoogleAuth must be used within GoogleAuthProvider");
  }
  return context;
}