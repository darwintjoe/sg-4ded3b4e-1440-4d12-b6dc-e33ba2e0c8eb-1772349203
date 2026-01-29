import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { CheckCircle2, Clock, X, UserCheck, UserX } from "lucide-react";
import { translate } from "@/lib/translations";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <X className="h-5 w-5" />
            </Button>
            <Clock className="h-8 w-8 text-blue-600 mx-auto" />
            <div className="w-10"></div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">
            {translate("attendance.title", language)}
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {translate("attendance.subtitle", language)}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={mode === "clockIn" ? "default" : "outline"}
              onClick={() => setMode("clockIn")}
              className="h-20 bg-green-600 hover:bg-green-700"
              style={mode === "clockIn" ? { backgroundColor: "#16a34a" } : {}}
            >
              <div className="flex flex-col items-center gap-2">
                <UserCheck className="h-6 w-6" />
                <span className="text-sm font-semibold">{translate("login.clockIn", language)}</span>
              </div>
            </Button>
            <Button
              variant={mode === "clockOut" ? "default" : "outline"}
              onClick={() => setMode("clockOut")}
              className="h-20 bg-red-600 hover:bg-red-700"
              style={mode === "clockOut" ? { backgroundColor: "#dc2626" } : {}}
            >
              <div className="flex flex-col items-center gap-2">
                <UserX className="h-6 w-6" />
                <span className="text-sm font-semibold">{translate("login.clockOut", language)}</span>
              </div>
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