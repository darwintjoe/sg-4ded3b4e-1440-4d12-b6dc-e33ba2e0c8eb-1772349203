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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <CheckCircle2 className="h-40 w-40 mx-auto text-green-600 animate-pulse" strokeWidth={2} />
          <p className="text-4xl font-black text-green-800 dark:text-green-400">
            {successMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 p-8">
      {/* Top Left Back Button */}
      <div className="absolute top-6 left-6">
        <Button variant="outline" size="lg" onClick={onBack} className="h-16 w-16 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <X className="h-7 w-7" />
        </Button>
      </div>

      {/* Top Right Language Selector */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      {/* Main Content - Full Screen */}
      <div className="w-full max-w-2xl flex flex-col items-center space-y-12">
        {/* Title with Clock */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-3xl shadow-2xl">
              <Clock className="h-20 w-20 text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            ATTENDANCE
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
            {translate("attendance.subtitle", language)}
          </p>
        </div>

        {/* Mode Selector - Clock In/Out */}
        <div className="w-full max-w-md grid grid-cols-2 gap-4">
          <Button
            variant={mode === "clockIn" ? "default" : "outline"}
            onClick={() => setMode("clockIn")}
            className={`h-28 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-xl ${
              mode === "clockIn"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 scale-105"
                : "bg-white dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <UserCheck className="h-10 w-10" />
              <span>{translate("login.clockIn", language)}</span>
            </div>
          </Button>
          <Button
            variant={mode === "clockOut" ? "default" : "outline"}
            onClick={() => setMode("clockOut")}
            className={`h-28 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-xl ${
              mode === "clockOut"
                ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 scale-105"
                : "bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <UserX className="h-10 w-10" />
              <span>{translate("login.clockOut", language)}</span>
            </div>
          </Button>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-6 py-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-6 w-6 rounded-full border-3 transition-all duration-300 ${
                i < pin.length
                  ? "bg-blue-600 border-blue-600 scale-125 shadow-lg shadow-blue-400/50"
                  : "bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-2xl px-6 py-4 animate-in fade-in slide-in-from-top-2">
            <p className="text-center text-lg text-red-700 dark:text-red-400 font-semibold">
              {error}
            </p>
          </div>
        )}

        {/* Number Pad - Large and Spacious */}
        <div className="w-full max-w-md">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => handlePinInput(num.toString())}
                className="h-24 text-3xl font-bold rounded-2xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900 hover:scale-105 transition-all shadow-md hover:shadow-xl border-2"
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={handleBackspace}
              className="h-24 text-2xl rounded-2xl bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900 hover:scale-105 transition-all shadow-md hover:shadow-xl border-2"
            >
              ←
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePinInput("0")}
              className="h-24 text-3xl font-bold rounded-2xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900 hover:scale-105 transition-all shadow-md hover:shadow-xl border-2"
            >
              0
            </Button>
            <Button
              onClick={handleSubmit}
              className="h-24 text-2xl font-bold rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-105 transition-all shadow-lg hover:shadow-xl"
            >
              ✓
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}