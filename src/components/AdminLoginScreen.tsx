import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";
import { ArrowLeft, Settings } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";

interface AdminLoginScreenProps {
  onBack: () => void;
}

export function AdminLoginScreen({ onBack }: AdminLoginScreenProps) {
  const { loginAdmin, language } = useApp();
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