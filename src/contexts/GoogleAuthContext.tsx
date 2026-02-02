import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { googleAuth } from "@/lib/google-auth";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isSignedIn: boolean;
  isInitialized: boolean;
  signIn: () => Promise<{ success: boolean; user?: GoogleUser; error?: string }>;
  signOut: () => void;
  uploadBackup: (data: any, filename: string) => Promise<{ success: boolean; error?: string }>;
  listBackups: () => Promise<{ success: boolean; backups?: any[]; error?: string }>;
  downloadBackup: (fileId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createCalendarEvent: (event: any) => Promise<{ success: boolean; error?: string }>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await googleAuth.initialize();
      const currentUser = googleAuth.getCurrentUser();
      setUser(currentUser);
      setIsInitialized(true);
    };

    init();
  }, []);

  const signIn = async () => {
    const result = await googleAuth.signIn();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, user: result.user, error: result.error };
  };

  const signOut = () => {
    googleAuth.signOut();
    setUser(null);
  };

  const uploadBackup = async (data: any, filename: string) => {
    return await googleAuth.uploadBackup(data, filename);
  };

  const listBackups = async () => {
    return await googleAuth.listBackups();
  };

  const downloadBackup = async (fileId: string) => {
    return await googleAuth.downloadBackup(fileId);
  };

  const createCalendarEvent = async (event: any) => {
    return await googleAuth.createCalendarEvent(event);
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isSignedIn: user !== null,
        isInitialized,
        signIn,
        signOut,
        uploadBackup,
        listBackups,
        downloadBackup,
        createCalendarEvent,
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