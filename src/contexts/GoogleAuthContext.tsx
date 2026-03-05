import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { googleAuth } from "@/lib/google-auth";
import { backupService } from "@/lib/backup-service";
import { db } from "@/lib/db";
import type { GoogleUser, BackupStatus, BackupData } from "@/types";

interface CalendarEvent {
  summary: string;
  description: string;
  start: string;
  end: string;
}

interface BackupAvailabilityInfo {
  timestamp: string;
  size: number;
  itemCount: number;
  employeeCount: number;
  checksumValid: boolean;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isSignedIn: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  signIn: () => Promise<{ success: boolean; user?: GoogleUser; error?: string }>;
  signOut: () => void;
  createCalendarEvent: (event: CalendarEvent) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  backupStatus: BackupStatus;
  refreshBackupStatus: (businessName?: string) => Promise<void>;
  createBackup: (businessName: string) => Promise<{ success: boolean; error?: string }>;
  checkBackupAvailability: (businessName: string) => Promise<{ exists: boolean; info?: BackupAvailabilityInfo; error?: string }>;
  startRestore: (businessName: string) => Promise<{ success: boolean; backupData?: BackupData; error?: string }>;
  backupCurrentDatabase: () => Promise<{ success: boolean; error?: string }>;
  loadPreview: (backupData: BackupData) => Promise<{ success: boolean; error?: string }>;
  finalizeRestore: (backupData: BackupData) => Promise<{ success: boolean; error?: string }>;
  cancelRestore: () => Promise<{ success: boolean; error?: string }>;
  revertRestore: () => Promise<{ success: boolean; error?: string }>;
  canRevert: () => { available: boolean; expiresAt: number | null; hoursRemaining: number | null };
  promoteCandidate: (businessName: string) => Promise<{ success: boolean; error?: string }>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

// Helper to get business name from settings (module-level for use in effects)
const getBusinessNameFromDb = async (): Promise<string> => {
  try {
    const settings = await db.getById("settings", 1) as { businessName?: string } | undefined;
    return settings?.businessName || "Store";
  } catch {
    return "Store";
  }
};

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    lastBackupTime: null,
    lastBackupStatus: null,
    isHealthy: false,
    message: "Initializing...",
    canRestore: false
  });

  // Sync NextAuth session to GoogleUser and google-auth service
  useEffect(() => {
    const syncSession = async () => {
      if (status === "loading") return;
      
      if (session?.user && session.accessToken) {
        // Create GoogleUser from NextAuth session
        const googleUser: GoogleUser = {
          id: session.user.id || session.user.email || "",
          name: session.user.name || "",
          email: session.user.email || "",
          imageUrl: session.user.image || "",
        };
        
        // Sync access token to google-auth service for API calls
        googleAuth.setAccessToken(session.accessToken);
        
        setUser(googleUser);
        
        // Check backup status
        const businessName = await getBusinessNameFromDb();
        const backupStat = await backupService.getBackupStatus(businessName);
        setBackupStatus(backupStat);
      } else {
        setUser(null);
        googleAuth.clearAccessToken();
      }
      
      setIsInitialized(true);
    };
    
    syncSession();
  }, [session, status]);

  // Check backup status periodically
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      
      try {
        const businessName = await getBusinessNameFromDb();
        const status = await backupService.getBackupStatus(businessName);
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
      const localStatus = localStorage.getItem("last_backup_status");
      
      if (!candidateTime || localStatus !== "pending") {
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
          const businessName = await getBusinessNameFromDb();
          const result = await backupService.promoteCandidate(businessName);
          if (result.success) {
            const updatedStatus = await backupService.getBackupStatus(businessName);
            setBackupStatus(updatedStatus);
          }
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

  const refreshBackupStatus = async (businessName?: string) => {
    const name = businessName || await getBusinessNameFromDb();
    const status = await backupService.getBackupStatus(name);
    setBackupStatus(status);
  };

  const signIn = async () => {
    setIsLoading(true);
    try {
      // Use NextAuth's signIn which will redirect to Google
      await nextAuthSignIn("google", { callbackUrl: window.location.href });
      // Note: This will redirect, so we won't reach here immediately
      // The session will be available after redirect back
      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: String(error) };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    googleAuth.clearAccessToken();
    setUser(null);
    setBackupStatus(prev => ({ ...prev, canRestore: false, message: "Not signed in" }));
    await nextAuthSignOut({ callbackUrl: window.location.href });
  };

  const createBackup = async (businessName: string) => {
    const result = await backupService.createBackup(businessName);
    const status = await backupService.getBackupStatus(businessName);
    setBackupStatus(status);
    
    if (result.success) {
      localStorage.setItem("candidate_created_at", Date.now().toString());
      localStorage.setItem("candidate_operational_hours", "0");
      localStorage.setItem("candidate_last_check", Date.now().toString());
    }
    
    return result;
  };

  const checkBackupAvailability = async (businessName: string) => {
    return backupService.checkBackupAvailability(businessName);
  };

  const startRestore = async (businessName: string) => {
    return backupService.startRestore(businessName);
  };

  const backupCurrentDatabase = async () => {
    return backupService.backupCurrentDatabase();
  };

  const loadPreview = async (backupData: BackupData) => {
    return backupService.loadPreview(backupData);
  };

  const finalizeRestore = async (backupData: BackupData) => {
    const businessName = await getBusinessNameFromDb();
    const result = await backupService.finalizeRestore(backupData);
    const status = await backupService.getBackupStatus(businessName);
    setBackupStatus(status);
    return result;
  };

  const cancelRestore = async () => {
    return backupService.cancelRestore();
  };

  const revertRestore = async () => {
    const businessName = await getBusinessNameFromDb();
    const result = await backupService.revertRestore();
    const status = await backupService.getBackupStatus(businessName);
    setBackupStatus(status);
    return result;
  };

  const canRevert = () => {
    return backupService.canRevert();
  };

  const promoteCandidate = async (businessName: string) => {
    const result = await backupService.promoteCandidate(businessName);
    const status = await backupService.getBackupStatus(businessName);
    setBackupStatus(status);
    return result;
  };

  const createCalendarEvent = async (event: CalendarEvent) => {
    return googleAuth.createCalendarEvent(event);
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isSignedIn: user !== null,
        isInitialized,
        isLoading,
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
        promoteCandidate
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