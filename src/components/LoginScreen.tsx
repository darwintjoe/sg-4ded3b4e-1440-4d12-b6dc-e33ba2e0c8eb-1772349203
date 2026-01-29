import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { CheckCircle2, LogIn, UserCheck, UserX, Globe } from "lucide-react";
import { translate } from "@/lib/translations";
import { Language } from "@/types";

export function LoginScreen() {
  const { login, resumeSession, isPaused, language, setLanguage, clockIn, clockOut } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [mode, setMode] = useState<"login" | "clockIn" | "clockOut">("login");

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

  const handleClockIn = async () => {
    if (pin.length < 4) {
      setError(translate("login.invalid", language));
      return;
    }

    const result = await clockIn(pin);
    if (result.success) {
      setSuccessMessage(translate(result.message, language));
      setShowSuccess(true);
      setPin("");
      setError("");
      setTimeout(() => {
        setShowSuccess(false);
        setMode("login");
      }, 2000);
    } else {
      setError(translate(result.message, language));
      setPin("");
    }
  };

  const handleClockOut = async () => {
    if (pin.length < 4) {
      setError(translate("login.invalid", language));
      return;
    }

    const result = await clockOut(pin);
    if (result.success) {
      setSuccessMessage(translate(result.message, language));
      setShowSuccess(true);
      setPin("");
      setError("");
      setTimeout(() => {
        setShowSuccess(false);
        setMode("login");
      }, 2000);
    } else {
      setError(translate(result.message, language));
      setPin("");
    }
  };

  const handleSubmit = () => {
    if (mode === "login") handleLogin();
    else if (mode === "clockIn") handleClockIn();
    else handleClockOut();
  };

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "English" },
    { code: "id", label: "Indonesia" },
    { code: "zh", label: "中文" }
  ];

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <CheckCircle2 className="h-32 w-32 mx-auto text-green-600 animate-pulse" />
          <p className="text-2xl font-bold text-green-800 dark:text-green-400">
            {successMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-black tracking-tight">
            {translate("login.title", language)}
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isPaused ? "Session Paused - Re-enter PIN" : translate("login.subtitle", language)}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Language Selector */}
          <div className="flex justify-center gap-2">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={language === lang.code ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage(lang.code)}
                className="text-xs"
              >
                <Globe className="h-3 w-3 mr-1" />
                {lang.label}
              </Button>
            ))}
          </div>

          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === "login" ? "default" : "outline"}
              onClick={() => setMode("login")}
              className="flex-1"
              size="sm"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {translate("login.button", language)}
            </Button>
            <Button
              variant={mode === "clockIn" ? "default" : "outline"}
              onClick={() => setMode("clockIn")}
              className="flex-1"
              size="sm"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {translate("login.clockIn", language)}
            </Button>
            <Button
              variant={mode === "clockOut" ? "default" : "outline"}
              onClick={() => setMode("clockOut")}
              className="flex-1"
              size="sm"
            >
              <UserX className="h-4 w-4 mr-2" />
              {translate("login.clockOut", language)}
            </Button>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 py-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  i < pin.length
                    ? "bg-blue-600 border-blue-600 scale-110"
                    : "bg-slate-200 border-slate-300 dark:bg-slate-700 dark:border-slate-600"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => handlePinInput(num.toString())}
                className="h-16 text-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={handleBackspace}
              className="h-16 text-lg hover:bg-red-100 dark:hover:bg-red-900"
            >
              ←
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePinInput("0")}
              className="h-16 text-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              0
            </Button>
            <Button
              onClick={handleSubmit}
              className="h-16 text-lg font-bold bg-green-600 hover:bg-green-700"
            >
              ✓
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}