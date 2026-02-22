import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  AlertCircle,
  CheckCircle2,
  Cloud,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info,
} from "lucide-react";
import { translate } from "@/lib/translations";

export interface RestoreState {
  phase: "idle" | "auth" | "checking" | "confirm_impact" | "downloading" | "preview" | "final_confirm" | "restoring" | "success" | "error";
  error?: string;
  backupInfo?: {
    timestamp: string;
    size: number;
    itemCount: number;
    employeeCount: number;
    source?: string;
  };
  progress?: number;
  pin?: string;
}

interface RestoreFlowDialogProps {
  restoreState: RestoreState;
  onPinChange: (pin: string) => void;
  onVerifyPin: () => void;
  onCancel: () => void;
  onStartPreview: () => void;
  onApplyRestore: () => void;
  language: string;
}

export function RestoreFlowDialog({
  restoreState,
  onPinChange,
  onVerifyPin,
  onCancel,
  onStartPreview,
  onApplyRestore,
  language,
}: RestoreFlowDialogProps) {
  if (restoreState.phase === "idle") return null;

  const handlePinDigit = (digit: string) => {
    if ((restoreState.pin?.length || 0) < 6) {
      onPinChange((restoreState.pin || "") + digit);
    }
  };

  const handlePinBackspace = () => {
    onPinChange(restoreState.pin?.slice(0, -1) || "");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-primary/20">
        
        {/* Auth Phase - PIN Entry */}
        {restoreState.phase === "auth" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Lock className="h-6 w-6" />
              <h2 className="text-xl font-bold">Admin Access Required</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter Admin PIN to access emergency restore functions.
            </p>
            
            {/* PIN Dots */}
            <div className="flex justify-center gap-3 py-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full border-2 transition-all duration-300 ${
                    i < (restoreState.pin?.length || 0)
                      ? "bg-amber-600 border-amber-600 scale-125 shadow-lg shadow-amber-400/50"
                      : "bg-muted border-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            {restoreState.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                <p className="text-sm text-red-600 text-center font-medium">{restoreState.error}</p>
              </div>
            )}

            {/* PIN Keypad */}
            <div className="w-full max-w-[280px] mx-auto">
              <div className="grid grid-cols-3 gap-4 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinDigit(num.toString())}
                    className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-muted hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-border"
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={handlePinBackspace}
                  className="h-14 w-14 mx-auto rounded-full text-lg bg-muted hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-border"
                >
                  ←
                </button>
                <button
                  onClick={() => handlePinDigit("0")}
                  className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-muted hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-border"
                >
                  0
                </button>
                <button
                  onClick={onVerifyPin}
                  disabled={(restoreState.pin?.length || 0) < 4}
                  className="h-14 w-14 mx-auto rounded-full text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                >
                  ✓
                </button>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Error Phase */}
        {restoreState.phase === "error" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Restore Failed</h2>
            </div>
            <p className="text-base font-medium">{restoreState.error}</p>
            <Button className="w-full" onClick={onCancel}>Close</Button>
          </div>
        )}

        {/* Checking Phase */}
        {restoreState.phase === "checking" && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p>Checking Google Drive...</p>
          </div>
        )}

        {/* Confirm Impact Phase */}
        {restoreState.phase === "confirm_impact" && restoreState.backupInfo && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Download className="h-6 w-6" />
              <h2 className="text-xl font-bold">Backup Found</h2>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-mono font-bold">
                  {new Date(restoreState.backupInfo.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>{(restoreState.backupInfo.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contains:</span>
                <span>{restoreState.backupInfo.itemCount} Items, {restoreState.backupInfo.employeeCount} Staff</span>
              </div>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will <strong>replace</strong> your current data. You will be able to review the data in Preview Mode before finalizing.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              <Button onClick={onStartPreview}>Continue to Preview</Button>
            </div>
          </div>
        )}

        {/* Downloading Phase */}
        {restoreState.phase === "downloading" && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <Cloud className="h-8 w-8 animate-bounce text-primary" />
            <div className="text-center space-y-1">
              <p className="font-medium">Preparing Preview...</p>
              <p className="text-xs text-muted-foreground">Downloading and verifying integrity</p>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${restoreState.progress}%` }} 
              />
            </div>
          </div>
        )}

        {/* Final Confirm Phase */}
        {restoreState.phase === "final_confirm" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Confirm Restore</h2>
            </div>
            
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will <strong>permanently replace</strong> your current database with the backup data. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              <Button variant="destructive" onClick={onApplyRestore}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Restore
              </Button>
            </div>
          </div>
        )}

        {/* Restoring Phase */}
        {restoreState.phase === "restoring" && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Restoring database...</p>
            <p className="text-xs text-muted-foreground">Please do not close this window</p>
          </div>
        )}

        {/* Success Phase */}
        {restoreState.phase === "success" && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 animate-pulse" />
            <h2 className="text-xl font-bold text-green-600">Restore Complete!</h2>
            <p className="text-muted-foreground">Your business data has been restored.</p>
            <p className="text-xs text-muted-foreground">Reloading application...</p>
          </div>
        )}
      </Card>
    </div>
  );
}