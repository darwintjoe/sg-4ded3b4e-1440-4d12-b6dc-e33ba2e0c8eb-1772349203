import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { Shield, X } from "lucide-react";
import { translate } from "@/lib/translations";

export function AdminLoginScreen({ onBack }: { onBack: () => void }) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-amber-500">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <X className="h-5 w-5" />
            </Button>
            <Shield className="h-8 w-8 text-amber-600 mx-auto" />
            <div className="w-10"></div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-amber-700 dark:text-amber-500">
            ADMIN LOGIN
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {translate("login.adminSubtitle", language)}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* PIN Display */}
          <div className="flex justify-center gap-3 py-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  i < pin.length
                    ? "bg-amber-600 border-amber-600 scale-110"
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
                className="h-16 text-xl font-semibold hover:bg-amber-100 dark:hover:bg-amber-900"
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
              className="h-16 text-xl font-semibold hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              0
            </Button>
            <Button
              onClick={handleLogin}
              className="h-16 text-lg font-bold bg-amber-600 hover:bg-amber-700"
            >
              ✓
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}