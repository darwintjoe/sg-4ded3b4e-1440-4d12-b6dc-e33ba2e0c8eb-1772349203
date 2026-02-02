import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { googleAuth } from "@/lib/google-auth";
import { backupService } from "@/lib/backup-service";

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
  finalizeRestore: (backupData: any) => Promise<{ success: boolean; error?: string }>;
  cancelRestore: () => Promise<{ success: boolean; error?: string }>;
  revertRestore: () => Promise<{ success: boolean; error?: string }>;
  canRevert: () => { available: boolean; expiresAt: number | null; hoursRemaining: number | null };
  promoteCandidate: () => Promise<{ success: boolean; error?: string }>;
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
      
      // Check backup status
      await refreshBackupStatus();
    };

    init();
  }, []);

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
    
    // If successful, try to promote after a short delay (simulating health check passed)
    if (result.success) {
      setTimeout(async () => {
        await promoteCandidate();
      }, 5000); // 5 seconds delay for "validation"
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

  const finalizeRestore = async (backupData: any) => {
    const result = await backupService.finalizeRestore(backupData);
    await refreshBackupStatus();
    return result;
  };

  const cancelRestore = async () => {
    return backupService.cancelRestore();
  };

  const revertRestore = async () => {
    const result = await backupService.revertRestore();
    await refreshBackupStatus();
    return result;
  };

  const canRevert = () => {
    return backupService.canRevert();
  };

  const promoteCandidate = async () => {
    const result = await backupService.promoteCandidate();
    await refreshBackupStatus();
    return result;
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