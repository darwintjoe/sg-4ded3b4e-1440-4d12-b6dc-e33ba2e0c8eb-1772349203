import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";
import { ArrowLeft, Settings } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";

interface AdminLoginScreenProps {
  onBack: () => void;
}

export function AdminLoginScreen({ onBack }: AdminLoginScreenProps) {
  const { loginAdmin, language } = useApp();
  const { signIn, isLoading } = useGoogleAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

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

    const success = await loginAdmin(pin);
    if (!success) {
      setError(translate("login.invalid", language));
      setPin("");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const success = await signIn();
      if (!success) {
        setError(translate("login.googleFailed", language));
      }
    } catch (error) {
      setError(translate("login.error", language));
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 p-4 overflow-hidden relative">
      {/* Top Bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <Button 
          variant="outline" 
          size="icon"
          onClick={onBack} 
          className="h-10 w-10 rounded-lg shadow-lg hover:shadow-xl transition-all bg-white/10 backdrop-blur border-white/20 hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
        <LanguageSelector />
      </div>

      {/* Error Message - Absolute positioned */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-20 animate-in fade-in slide-in-from-top-2">
          <div className="bg-red-500/20 border-2 border-red-400 rounded-xl px-4 py-2 max-w-md mx-auto">
            <p className="text-center text-sm text-red-200 font-semibold">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Fixed position layout */}
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Shield Icon */}
        <div className="flex justify-center mb-3">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-2xl">
            <Settings className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight text-white text-center mb-1">
          {translate("login.adminTitle", language)}
        </h1>
        <p className="text-sm text-amber-200 font-medium text-center mb-4">
          {translate("login.adminSubtitle", language)}
        </p>

        {/* Google Login Button (Alternate) */}
        <div className="mb-6 w-full max-w-[280px]">
          <Button 
            variant="outline" 
            className="w-full bg-white text-gray-700 hover:bg-gray-100 border-none shadow-md h-10 gap-2 font-medium"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {translate("login.google", language)}
          </Button>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${
                i < pin.length
                  ? "bg-amber-400 border-amber-400 scale-125 shadow-lg shadow-amber-300/50"
                  : "bg-white/20 border-white/40"
              }`}
            />
          ))}
        </div>

        {/* Number Pad - Standardized circular buttons (EXACT SAME as LoginScreen) */}
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
              className="h-14 w-14 mx-auto rounded-full text-lg font-bold bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl text-zinc-900"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}