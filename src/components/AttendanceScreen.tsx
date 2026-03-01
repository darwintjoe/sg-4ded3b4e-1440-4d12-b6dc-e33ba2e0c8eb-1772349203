import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{translate("common.back", language)}</span>
        </button>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Clock className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {translate("attendance.title", language)}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {translate("attendance.subtitle", language)}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <button
            onClick={() => setMode("clockIn")}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
              mode === "clockIn"
                ? "bg-green-500 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {translate("login.clockIn", language)}
          </button>
          <button
            onClick={() => setMode("clockOut")}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
              mode === "clockOut"
                ? "bg-teal-500 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {translate("login.clockOut", language)}
          </button>
        </div>

        {/* PIN Input */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {translate("login.enterPin", language)}
            </label>
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="••••"
              className="text-2xl text-center tracking-widest h-14"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 text-center">
                {success}
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700"
            disabled={pin.length < 4}
          >
            {mode === "clockIn" 
              ? translate("login.clockIn", language)
              : translate("login.clockOut", language)
            }
          </Button>
        </div>
      </div>
    </div>
  );
}