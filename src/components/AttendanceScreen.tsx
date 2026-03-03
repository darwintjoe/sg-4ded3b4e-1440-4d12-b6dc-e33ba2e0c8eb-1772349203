import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";
import { ArrowLeft, Clock } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";

interface AttendanceScreenProps {
  onBack: () => void;
}

export function AttendanceScreen({ onBack }: AttendanceScreenProps) {
  const { clockIn, clockOut, language } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"clockIn" | "clockOut">("clockIn");

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
      setError(translate("login.pinRequired", language));
      return;
    }

    setError("");
    setSuccess("");

    const result = mode === "clockIn" 
      ? await clockIn(pin)
      : await clockOut(pin);

    if (result.success) {
      setSuccess(translate(result.message, language));
      setPin("");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(translate(result.message, language));
      setPin("");
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] via-[#1a2f2a] to-[#1a1a1a] p-4 overflow-hidden relative">
      {/* Top Bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur px-3 py-2 rounded-lg border border-white/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{translate("common.back", language)}</span>
        </button>
        <LanguageSelector />
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-20 animate-in fade-in slide-in-from-top-2">
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl px-4 py-2 max-w-md mx-auto">
            <p className="text-center text-sm text-red-300 font-semibold">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="absolute top-20 left-4 right-4 z-20 animate-in fade-in slide-in-from-top-2">
          <div className="bg-green-500/20 border-2 border-green-500 rounded-xl px-4 py-2 max-w-md mx-auto">
            <p className="text-center text-sm text-green-300 font-semibold">
              {success}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/30">
            <Clock className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          {translate("attendance.title", language)}
        </h1>
        <p className="text-sm text-green-200/90 font-medium text-center mb-4">
          {translate("attendance.subtitle", language)}
        </p>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-white/10 backdrop-blur rounded-lg mb-4 w-full max-w-[280px]">
          <button
            onClick={() => { setMode("clockIn"); setError(""); }}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all text-sm ${
              mode === "clockIn"
                ? "bg-green-500 text-white shadow-md"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            {translate("login.clockIn", language)}
          </button>
          <button
            onClick={() => { setMode("clockOut"); setError(""); }}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all text-sm ${
              mode === "clockOut"
                ? "bg-teal-500 text-white shadow-md"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            {translate("login.clockOut", language)}
          </button>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${
                i < pin.length
                  ? "bg-green-400 border-green-400 scale-125 shadow-lg shadow-green-400/50"
                  : "bg-white/20 border-white/40"
              }`}
            />
          ))}
        </div>

        {/* Number Pad */}
        <div className="w-full max-w-[280px]">
          <div className="grid grid-cols-3 gap-4 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-white/10 backdrop-blur hover:bg-green-500/30 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-white/20 text-white"
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
              className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-white/10 backdrop-blur hover:bg-green-500/30 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-white/20 text-white"
            >
              0
            </button>
            <button
              onClick={handleSubmit}
              disabled={pin.length < 4}
              className="h-14 w-14 mx-auto rounded-full text-lg font-bold bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}