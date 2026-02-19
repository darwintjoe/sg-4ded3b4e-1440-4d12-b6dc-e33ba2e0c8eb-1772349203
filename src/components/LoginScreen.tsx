import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { Settings, Clock, Store } from "lucide-react";
import { translate } from "@/lib/translations";
import { LanguageSelector } from "@/components/LanguageSelector";
import Image from "next/image";

interface LoginScreenProps {
  onAdminClick: () => void;
  onAttendanceClick: () => void;
}

export function LoginScreen({ onAdminClick, onAttendanceClick }: LoginScreenProps) {
  const { login, resumeSession, isPaused, language, currentUser } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");

  useEffect(() => {
    // Show session restoration message if user is already logged in
    if (currentUser && !isPaused) {
      setSessionMessage(translate("login.sessionRestored", language));
      setTimeout(() => setSessionMessage(""), 3000);
    }
  }, [currentUser, isPaused, language]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const handleLogin = async () => {
    if (pin.length < 4) {
      setError(translate("login.invalid", language));
      return;
    }

    const success = isPaused ? await resumeSession(pin) : await login(pin);
    if (success) {
      setPin("");
      setError("");
    } else {
      setError(translate("login.invalid", language));
      setPin("");
    }
  };

  const handleResume = async () => {
    if (pin.length !== 4) {
      setError(translate("login.pinRequired", language));
      return;
    }

    setError("");

    try {
      const success = await resumeSession(pin);
      if (success) {
        setPin("");
        setError("");
      } else {
        setError(translate("login.resumeFailed", language));
      }
    } catch (err) {
      setError(translate("login.error", language));
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] via-[#2d2520] to-[#1a1a1a] p-4 overflow-hidden relative">
      {/* Top Bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={onAdminClick} 
            className="h-10 w-10 rounded-lg shadow-lg hover:shadow-xl transition-all bg-white/10 backdrop-blur border-white/20 hover:bg-white/20"
          >
            <Settings className="h-4 w-4 text-white" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={onAttendanceClick} 
            className="h-10 w-10 rounded-lg shadow-lg hover:shadow-xl transition-all bg-white/10 backdrop-blur border-white/20 hover:bg-white/20"
          >
            <Clock className="h-4 w-4 text-white" />
          </Button>
        </div>
        <LanguageSelector />
      </div>

      {/* Error Message - Absolute positioned to avoid layout shift */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-20 animate-in fade-in slide-in-from-top-2">
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl px-4 py-2 max-w-md mx-auto">
            <p className="text-center text-sm text-red-300 font-semibold">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Session Restored Message */}
      {sessionMessage && (
        <div className="absolute top-20 left-4 right-4 z-20 animate-in fade-in slide-in-from-top-2">
          <div className="bg-green-500/20 border-2 border-green-500 rounded-xl px-4 py-2 max-w-md mx-auto">
            <p className="text-center text-sm text-green-300 font-semibold">
              {sessionMessage}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Fixed position layout */}
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/app_logo_with_text_small.png" 
            alt="Sell More" 
            className="w-48 drop-shadow-2xl"
            style={{ mixBlendMode: 'screen' }}
          />
        </div>

        {/* Subtitle */}
        <p className="text-sm text-amber-200/90 font-medium text-center mb-4">
          {isPaused ? "Session Paused - Re-enter PIN" : translate("login.subtitle", language)}
        </p>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${
                i < pin.length
                  ? "bg-amber-400 border-amber-400 scale-125 shadow-lg shadow-amber-400/50"
                  : "bg-white/20 border-white/40"
              }`}
            />
          ))}
        </div>

        {/* Number Pad - Standardized circular buttons */}
        <div className="w-full max-w-[280px]">
          <div className="grid grid-cols-3 gap-4 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-white/10 backdrop-blur hover:bg-amber-500/30 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-white/20 text-white"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={handleBackspace}
              className="h-14 w-14 mx-auto rounded-full text-lg bg-white/10 backdrop-blur hover:bg-red-500/30 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-white/20 text-white"
            >
              ←
            </button>
            <button
              onClick={() => handlePinInput("0")}
              className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-white/10 backdrop-blur hover:bg-amber-500/30 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-white/20 text-white"
            >
              0
            </button>
            <button
              onClick={handleLogin}
              className="h-14 w-14 mx-auto rounded-full text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl text-zinc-900"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}