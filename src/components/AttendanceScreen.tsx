import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { CheckCircle2, Clock, X, UserCheck, UserX } from "lucide-react";
import { translate } from "@/lib/translations";
import { LanguageSelector } from "@/components/LanguageSelector";

export function AttendanceScreen({ onBack }: { onBack: () => void }) {
  const { clockIn, clockOut, language } = useApp();
  const [mode, setMode] = useState<"clockIn" | "clockOut">("clockIn");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError(translate("login.invalid", language));
      return;
    }

    const result = mode === "clockIn" ? await clockIn(pin) : await clockOut(pin);
    
    if (result.success) {
      setSuccessMessage(translate(result.message, language));
      setShowSuccess(true);
      setPin("");
      setError("");
      setTimeout(() => {
        setShowSuccess(false);
        setPin("");
      }, 2000);
    } else {
      setError(translate(result.message, language));
      setPin("");
    }
  };

  if (showSuccess) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700 p-4 overflow-hidden">
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <CheckCircle2 className="h-32 w-32 mx-auto text-white animate-pulse" strokeWidth={2} />
          <p className="text-3xl font-black text-white px-4">
            {successMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-cyan-900 to-teal-900 p-4 overflow-hidden relative">
      {/* Top Bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <Button 
          variant="outline" 
          size="icon"
          onClick={onBack} 
          className="h-10 w-10 rounded-lg shadow-lg hover:shadow-xl transition-all bg-white/10 backdrop-blur border-white/20 hover:bg-white/20"
        >
          <X className="h-4 w-4 text-white" />
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
        {/* Clock Icon */}
        <div className="flex justify-center mb-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-2xl shadow-2xl">
            <Clock className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight text-white text-center mb-1">
          ATTENDANCE
        </h1>
        <p className="text-sm text-cyan-200 font-medium text-center mb-3">
          {translate("attendance.subtitle", language)}
        </p>

        {/* Mode Selector - Compact */}
        <div className="w-full grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setMode("clockIn")}
            className={`h-14 rounded-lg text-xs font-bold transition-all shadow-lg hover:shadow-xl ${
              mode === "clockIn"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 scale-105 text-white"
                : "bg-white/10 backdrop-blur hover:bg-green-500/30 border border-white/20 text-white"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <UserCheck className="h-5 w-5" />
              <span>{translate("login.clockIn", language)}</span>
            </div>
          </button>
          <button
            onClick={() => setMode("clockOut")}
            className={`h-14 rounded-lg text-xs font-bold transition-all shadow-lg hover:shadow-xl ${
              mode === "clockOut"
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 scale-105 text-white"
                : "bg-white/10 backdrop-blur hover:bg-red-500/30 border border-white/20 text-white"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <UserX className="h-5 w-5" />
              <span>{translate("login.clockOut", language)}</span>
            </div>
          </button>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${
                i < pin.length
                  ? "bg-cyan-400 border-cyan-400 scale-125 shadow-lg shadow-cyan-300/50"
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
                className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-white/10 backdrop-blur hover:bg-cyan-500/30 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-white/20 text-white"
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
              className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-white/10 backdrop-blur hover:bg-cyan-500/30 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-white/20 text-white"
            >
              0
            </button>
            <button
              onClick={handleSubmit}
              className="h-14 w-14 mx-auto rounded-full text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl text-zinc-900"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}