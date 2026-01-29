import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { Shield, X } from "lucide-react";
import { translate } from "@/lib/translations";
import { LanguageSelector } from "@/components/LanguageSelector";

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 p-4 overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={onBack} 
          className="h-12 w-12 rounded-xl shadow-lg hover:shadow-xl transition-all bg-white/10 backdrop-blur border-white/20 hover:bg-white/20"
        >
          <X className="h-5 w-5 text-white" />
        </Button>
        <LanguageSelector />
      </div>

      {/* Main Content - Centered and Compact */}
      <div className="w-full max-w-md flex flex-col items-center space-y-6">
        {/* Shield Icon */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl shadow-2xl">
            <Shield className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black tracking-tight text-white text-center">
          ADMIN LOGIN
        </h1>
        <p className="text-base text-amber-200 font-medium text-center -mt-2">
          {translate("login.adminSubtitle", language)}
        </p>

        {/* PIN Display - Compact */}
        <div className="flex justify-center gap-4 py-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
                i < pin.length
                  ? "bg-amber-400 border-amber-400 scale-125 shadow-lg shadow-amber-300/50"
                  : "bg-white/20 border-white/40"
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border-2 border-red-400 rounded-xl px-4 py-2 animate-in fade-in slide-in-from-top-2">
            <p className="text-center text-sm text-red-200 font-semibold">
              {error}
            </p>
          </div>
        )}

        {/* Number Pad - Compact Grid */}
        <div className="w-full">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => handlePinInput(num.toString())}
                className="h-16 text-2xl font-bold rounded-xl bg-white/10 backdrop-blur hover:bg-amber-500/30 hover:scale-105 transition-all shadow-md hover:shadow-xl border-white/20 text-white"
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={handleBackspace}
              className="h-16 text-xl rounded-xl bg-white/10 backdrop-blur hover:bg-red-500/30 hover:scale-105 transition-all shadow-md hover:shadow-xl border-white/20 text-white"
            >
              ←
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePinInput("0")}
              className="h-16 text-2xl font-bold rounded-xl bg-white/10 backdrop-blur hover:bg-amber-500/30 hover:scale-105 transition-all shadow-md hover:shadow-xl border-white/20 text-white"
            >
              0
            </Button>
            <Button
              onClick={handleLogin}
              className="h-16 text-xl font-bold rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 hover:scale-105 transition-all shadow-lg hover:shadow-xl text-slate-900"
            >
              ✓
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}