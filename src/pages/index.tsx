import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AdminLoginScreen } from "@/components/AdminLoginScreen";
import { AttendanceScreen } from "@/components/AttendanceScreen";
import { POSScreen } from "@/components/POSScreen";
import { AdminDashboard } from "@/components/AdminDashboard";
import { SEO } from "@/components/SEO";

type Screen = "login" | "adminLogin" | "attendance" | "pos" | "adminDashboard";

export default function Home() {
  const { currentUser, adminUser, isPaused } = useApp();
  const [screen, setScreen] = useState<Screen>("login");

  // Determine which screen to show based on state and user context
  const getActiveScreen = () => {
    if (adminUser) return "adminDashboard";
    if (screen === "adminLogin") return "adminLogin";
    if (screen === "attendance") return "attendance";
    if (!currentUser || isPaused) return "login";
    return "pos";
  };

  const activeScreen = getActiveScreen();

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
        />
      )}
      
      {activeScreen === "adminDashboard" && (
        <AdminDashboard />
      )}
    </>
  );
}