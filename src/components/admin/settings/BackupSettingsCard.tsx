import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Cloud,
  Upload,
  Download,
  Lock,
  Info,
  CheckCircle2,
  Loader2,
  CreditCard,
  Calendar,
  Key,
  QrCode,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { translate } from "@/lib/translations";
import { 
  getSubscriptionInfo, 
  activateSubscriptionCode, 
  DEVELOPER_QRIS,
  SubscriptionInfo
} from "@/lib/subscription-service";
import type { BackupStatus, Language } from "@/types";

interface BackupSettingsCardProps {
  language: Language;
  isSignedIn: boolean;
  user: { email: string } | null;
  backupStatus: BackupStatus;
  backupProcessing: boolean;
  restoreDisabled: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onBackupNow: () => void;
  onRestore: () => void;
  // PIN change props
  currentPin: string;
  newPin: string;
  confirmPin: string;
  onCurrentPinChange: (value: string) => void;
  onNewPinChange: (value: string) => void;
  onConfirmPinChange: (value: string) => void;
  onChangePinSubmit: () => void;
}

export function BackupSettingsCard({
  language,
  isSignedIn,
  user,
  backupStatus,
  backupProcessing,
  restoreDisabled,
  onGoogleSignIn,
  onGoogleSignOut,
  onBackupNow,
  onRestore,
  currentPin,
  newPin,
  confirmPin,
  onCurrentPinChange,
  onNewPinChange,
  onConfirmPinChange,
  onChangePinSubmit,
}: BackupSettingsCardProps) {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>(getSubscriptionInfo());
  const [subscriptionCode, setSubscriptionCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [showQRIS, setShowQRIS] = useState(false);
  
  // PIN visibility states
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const handleActivateCode = async () => {
    if (!subscriptionCode.trim()) return;
    
    setActivating(true);
    setActivationError("");
    
    try {
      const result = activateSubscriptionCode(subscriptionCode.trim());
      
      if (result.success && result.subscription) {
        setSubscriptionInfo(result.subscription);
        setSubscriptionCode("");
        setActivationError("");
      } else {
        setActivationError(result.error || "Invalid code");
      }
    } catch (error) {
      setActivationError("Failed to activate code");
    } finally {
      setActivating(false);
    }
  };

  const getStatusLabel = (status: SubscriptionInfo["status"]): string => {
    switch (status) {
      case "active": return "Active";
      case "warning": return "Expiring Soon";
      case "critical": return "Critical";
      case "expired": return "Expired";
      case "none": return "No Subscription";
      default: return "Unknown";
    }
  };

  const getStatusBadgeVariant = (status: SubscriptionInfo["status"]) => {
    switch (status) {
      case "active": return "default";
      case "warning": return "secondary";
      case "critical": return "destructive";
      case "expired": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      {/* Subscription Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 justify-between text-base">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {translate("settings.subscription", language)}
            </div>
            <Badge 
              variant={getStatusBadgeVariant(subscriptionInfo.status)}
              className={subscriptionInfo.status === "active" ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}
            >
              {getStatusLabel(subscriptionInfo.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Expiry Date - only show if has subscription */}
          {subscriptionInfo.expiryDate && (
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-medium">
                {subscriptionInfo.expiryDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </span>
              {subscriptionInfo.daysRemaining > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  ({subscriptionInfo.daysRemaining} days)
                </span>
              )}
            </div>
          )}

          {/* Warning for expiring/expired */}
          {(subscriptionInfo.status === "warning" || subscriptionInfo.status === "critical") && (
            <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 py-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-700 dark:text-orange-400 text-xs">
                Subscription expiring soon. Renew to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          {subscriptionInfo.status === "expired" && (
            <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20 py-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-400 text-xs">
                Subscription expired. Cloud backup is disabled.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Activate/Renew Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">
              {subscriptionInfo.status === "none" || subscriptionInfo.status === "expired" 
                ? "Activate Subscription" 
                : "Extend Subscription"
              }
            </h4>

            {/* Option 1: Enter Code */}
            <div className="space-y-2">
              <Label htmlFor="subscriptionCode" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Key className="h-3 w-3" />
                Enter Subscription Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="subscriptionCode"
                  placeholder="SM-XXXX-XXXX-XXXXX"
                  value={subscriptionCode}
                  onChange={(e) => {
                    setSubscriptionCode(e.target.value.toUpperCase());
                    setActivationError("");
                  }}
                  className="font-mono text-sm h-9"
                />
                <Button 
                  onClick={handleActivateCode}
                  disabled={!subscriptionCode.trim() || activating}
                  size="sm"
                  className="h-9 px-4"
                >
                  {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
                </Button>
              </div>
              {activationError && (
                <p className="text-xs text-red-500">{activationError}</p>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Option 2: Pay with QRIS - 1 Year Only */}
            <div className="space-y-2">
              {!showQRIS ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 gap-2"
                  onClick={() => setShowQRIS(true)}
                >
                  <QrCode className="h-4 w-4" />
                  Pay with QRIS (1 Year)
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border text-center">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-2">
                      {/* Placeholder for QRIS - In production, generate actual QR */}
                      <div className="w-40 h-40 mx-auto bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                        <QrCode className="h-20 w-20 text-slate-400" />
                      </div>
                    </div>
                    <p className="font-semibold text-sm">1 Year Subscription</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scan to pay via QRIS
                    </p>
                  </div>
                  <Alert className="py-2">
                    <Info className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      After payment, you&apos;ll receive a code via WhatsApp within 24 hours.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-8 text-xs"
                    onClick={() => setShowQRIS(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin PIN Card - Compact Design */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            {translate("settings.changeAdminPIN", language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="currentPin" className="text-xs text-muted-foreground">Current</Label>
              <div className="relative">
                <Input
                  id="currentPin"
                  type={showCurrentPin ? "text" : "password"}
                  maxLength={6}
                  placeholder="••••"
                  value={currentPin}
                  onChange={(e) => onCurrentPinChange(e.target.value.replace(/\D/g, ""))}
                  className="h-9 pr-8 text-center font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPin" className="text-xs text-muted-foreground">New</Label>
              <div className="relative">
                <Input
                  id="newPin"
                  type={showNewPin ? "text" : "password"}
                  maxLength={6}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => onNewPinChange(e.target.value.replace(/\D/g, ""))}
                  className="h-9 pr-8 text-center font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPin" className="text-xs text-muted-foreground">Confirm</Label>
              <div className="relative">
                <Input
                  id="confirmPin"
                  type={showConfirmPin ? "text" : "password"}
                  maxLength={6}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => onConfirmPinChange(e.target.value.replace(/\D/g, ""))}
                  className="h-9 pr-8 text-center font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <Button 
            onClick={onChangePinSubmit} 
            className="w-full mt-3 h-9"
            size="sm"
            disabled={!currentPin || !newPin || !confirmPin || newPin.length < 4}
          >
            {translate("settings.changePIN", language)}
          </Button>
        </CardContent>
      </Card>

      {/* Google Drive Backup Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 justify-between text-base">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              {translate("settings.dataBackup", language)}
            </div>
            {isSignedIn && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {translate("settings.protected", language)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Backup blocked warning if expired */}
          {subscriptionInfo.status === "expired" && (
            <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20 py-2">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-400 text-xs">
                Cloud backup disabled - subscription expired.
              </AlertDescription>
            </Alert>
          )}

          {!isSignedIn ? (
            <>
              <p className="text-xs text-muted-foreground">
                {translate("settings.backup.signInHint", language)}
              </p>
              <Button 
                onClick={onGoogleSignIn} 
                className="w-full h-9" 
                size="sm"
                disabled={subscriptionInfo.status === "expired"}
              >
                <Cloud className="h-3 w-3 mr-2" />
                {translate("settings.backup.connect", language)}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium truncate max-w-[180px]">{user?.email}</span>
                </div>
                {backupStatus.lastBackupTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Backup:</span>
                    <span className="font-medium">
                      {new Date(backupStatus.lastBackupTime).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge 
                    variant={backupStatus.isHealthy ? "default" : "secondary"} 
                    className={`text-xs h-5 ${backupStatus.isHealthy ? "bg-green-500/10 text-green-700" : ""}`}
                  >
                    {backupStatus.isHealthy ? "Healthy" : backupStatus.message}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={onBackupNow} 
                  className="flex-1 h-9" 
                  size="sm"
                  disabled={backupProcessing || subscriptionInfo.status === "expired"}
                >
                  {backupProcessing ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1.5" />
                  )}
                  {translate("settings.backup.backupNow", language)}
                </Button>
                <Button 
                  onClick={onRestore} 
                  variant="outline" 
                  className="flex-1 h-9" 
                  size="sm"
                  disabled={restoreDisabled}
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  {translate("settings.backup.restore", language)}
                </Button>
              </div>

              <Button 
                onClick={onGoogleSignOut} 
                variant="ghost" 
                size="sm" 
                className="w-full h-8 text-xs text-muted-foreground"
              >
                {translate("settings.backup.disconnect", language)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}