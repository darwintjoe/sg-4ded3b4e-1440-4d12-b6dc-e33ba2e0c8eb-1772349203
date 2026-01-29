import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { Settings, Clock } from "lucide-react";
import { translate } from "@/lib/translations";
import { LanguageSelector } from "@/components/LanguageSelector";

interface LoginScreenProps {
  onAdminClick: () => void;
  onAttendanceClick: () => void;
}

export function LoginScreen({ onAdminClick, onAttendanceClick }: LoginScreenProps) {
  const { login, resumeSession, isPaused, language } = useApp();
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

    const success = isPaused ? await resumeSession(pin) : await login(pin);
    if (success) {
      setPin("");
      setError("");
    } else {
      setError(translate("login.invalid", language));
      setPin("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-8">
      {/* Top Left Icons */}
      <div className="absolute top-6 left-6 flex gap-3">
        <Button variant="outline" size="lg" onClick={onAdminClick} className="h-16 w-16 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <Settings className="h-7 w-7" />
        </Button>
        <Button variant="outline" size="lg" onClick={onAttendanceClick} className="h-16 w-16 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <Clock className="h-7 w-7" />
        </Button>
      </div>

      {/* Top Right Language Selector */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      {/* Main Content - Full Screen */}
      <div className="w-full max-w-2xl flex flex-col items-center space-y-12">
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-7xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SELL MORE
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
            {isPaused ? "Session Paused - Re-enter PIN" : translate("login.subtitle", language)}
          </p>
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
              onClick={handleLogin}
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