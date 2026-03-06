import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AdminLoginScreen } from "@/components/AdminLoginScreen";
import { AttendanceScreen } from "@/components/AttendanceScreen";
import { POSScreen } from "@/components/POSScreen";
import { AdminDashboard } from "@/components/AdminDashboard";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";

type Screen = "login" | "adminLogin" | "attendance" | "pos" | "adminDashboard";

// Screen hierarchy for back navigation
const SCREEN_HIERARCHY: Record<Screen, Screen | null> = {
  login: null,
  adminLogin: "login",
  attendance: "login",
  pos: "login",
  adminDashboard: "pos",
};

export default function Home() {
  const { currentUser, adminUser, isInitializing, loadingStatus, logoutAdmin, logout } = useApp();
  const { toast } = useToast();
  const [screen, setScreen] = useState<Screen>("login");
  const lastBackPressRef = useRef<number>(0);
  const historyInitializedRef = useRef<boolean>(false);

  // Helper to get active screen value
  const getActiveScreenValue = useCallback((): Screen => {
    if (adminUser) return "adminDashboard";
    if (screen === "adminLogin") return "adminLogin";
    if (screen === "attendance") return "attendance";
    if (!currentUser) return "login";
    return "pos";
  }, [adminUser, screen, currentUser]);

  // Handle back navigation logic
  const handleBackNavigation = useCallback((): boolean => {
    const activeScreen = getActiveScreenValue();
    
    // If on login screen, handle exit confirmation
    if (activeScreen === "login") {
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Double back press - allow exit by not pushing new state
        return true;
      } else {
        lastBackPressRef.current = now;
        toast({
          title: "Press back again to exit",
          duration: 2000,
        });
        return false;
      }
    }

    // Handle admin dashboard - logout admin
    if (activeScreen === "adminDashboard") {
      logoutAdmin();
      return false;
    }

    // Handle POS - logout user
    if (activeScreen === "pos") {
      logout();
      return false;
    }

    // Navigate to previous screen for other screens
    const previousScreen = SCREEN_HIERARCHY[activeScreen];
    if (previousScreen) {
      setScreen(previousScreen);
    }
    
    return false;
  }, [getActiveScreenValue, toast, logoutAdmin, logout]);

  // Initialize and manage browser history for back button support
  useEffect(() => {
    if (isInitializing) return;

    // Initialize history with two entries so back button works within app
    if (!historyInitializedRef.current) {
      historyInitializedRef.current = true;
      // Replace current state
      window.history.replaceState({ page: 1 }, "");
      // Push a second state so we have room to go "back"
      window.history.pushState({ page: 2 }, "");
    }

    const handlePopState = () => {
      // User pressed back, handle navigation
      const shouldExit = handleBackNavigation();
      
      if (!shouldExit) {
        // Push state again to maintain history buffer
        // This keeps user in the app
        window.history.pushState({ page: 2 }, "");
      }
      // If shouldExit is true, we don't push state, allowing actual exit
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isInitializing, handleBackNavigation]);

  // Auto-reset screen when admin logs out
  useEffect(() => {
    if (!adminUser && screen === "adminDashboard") {
      setScreen(currentUser ? "pos" : "login");
    }
  }, [adminUser, currentUser, screen]);

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-6 p-8">
          {/* Animated Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-blue-600 dark:border-blue-400 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
            </div>
          </div>

          {/* App Title */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              SELL MORE
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mobile POS System
            </p>
          </div>

          {/* Loading Status */}
          <div className="space-y-2">
            <div className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {loadingStatus}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ width: "60%" }}></div>
            </div>
          </div>

          {/* Helper text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Please wait while we prepare your system. This usually takes 5-10 seconds.
          </p>
        </div>
      </div>
    );
  }

  // Determine which screen to show
  const activeScreen = getActiveScreenValue();

  const handleAdminClick = () => {
    setScreen("adminLogin");
  };

  const handleAttendanceClick = () => {
    setScreen("attendance");
  };

  const handleBackToLogin = () => {
    setScreen("login");
  };

  return (
    <>
      <SEO
        title="SELL MORE - Mobile POS System"
        description="Offline-first point of sale system optimized for retail and cafe/restaurant businesses"
      />
      
      {activeScreen === "login" && (
        <LoginScreen
          onAdminClick={handleAdminClick}
          onAttendanceClick={handleAttendanceClick}
        />
      )}
      
      {activeScreen === "adminLogin" && (
        <AdminLoginScreen onBack={handleBackToLogin} />
      )}
      
      {activeScreen === "attendance" && (
        <AttendanceScreen onBack={handleBackToLogin} />
      )}
      
      {activeScreen === "pos" && (
        <POSScreen
          onAdminClick={handleAdminClick}
          onAttendanceClick={handleAttendanceClick}
          onLockScreen={handleBackToLogin}
        />
      )}
      
      {activeScreen === "adminDashboard" && (
        <AdminDashboard />
      )}
    </>
  );
}