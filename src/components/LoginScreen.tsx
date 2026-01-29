import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { Hash } from "lucide-react";

export function LoginScreen() {
  const { login, isPaused, resumeSession } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    const success = isPaused ? await resumeSession(pin) : await login(pin);
    
    if (!success) {
      setError("Invalid PIN");
      setPin("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
              <Hash className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">SELL MORE</CardTitle>
          <CardDescription className="text-base">
            {isPaused ? "Resume Session" : "Enter PIN to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPaused && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                Session Paused - Enter PIN to resume
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="h-16 rounded-lg border-2 border-slate-600 bg-slate-800/50 flex items-center justify-center">
              <div className="flex gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full ${
                      i < pin.length ? "bg-blue-600" : "bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center font-medium">{error}</p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  size="lg"
                  className="h-16 text-xl font-semibold border-slate-600 hover:bg-slate-700 hover:border-blue-500"
                  onClick={() => handleNumberClick(num.toString())}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold border-slate-600 hover:bg-red-600 hover:border-red-500"
                onClick={handleClear}
              >
                CLR
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold border-slate-600 hover:bg-slate-700 hover:border-blue-500"
                onClick={() => handleNumberClick("0")}
              >
                0
              </Button>
              <Button
                size="lg"
                className="h-16 text-xl font-semibold bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
              >
                OK
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}