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
} from "lucide-react";
import { translate } from "@/lib/translations";
import { 
  getSubscriptionInfo, 
  activateSubscriptionCode, 
  getSubscriptionBarColor,
  DEVELOPER_QRIS,
  formatPriceIDR,
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
  const [selectedDuration, setSelectedDuration] = useState<number>(12);

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
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {translate("settings.subscription", language)}
            </div>
            <Badge 
              variant={getStatusBadgeVariant(subscriptionInfo.status)}
              style={{ 
                backgroundColor: subscriptionInfo.status === "active" ? "#22c55e20" : undefined,
                color: subscriptionInfo.status === "active" ? "#22c55e" : undefined
              }}
            >
              {getStatusLabel(subscriptionInfo.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subscription Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscription Status</span>
              <span className="font-medium">
                {subscriptionInfo.daysRemaining > 0 
                  ? `${subscriptionInfo.daysRemaining} days remaining`
                  : subscriptionInfo.status === "none" ? "Not activated" : "Expired"
                }
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{ 
                  width: `${Math.min(100, (subscriptionInfo.daysRemaining / 365) * 100)}%`,
                  backgroundColor: getSubscriptionBarColor(subscriptionInfo.status)
                }}
              />
            </div>
          </div>

          {/* Expiry Date */}
          {subscriptionInfo.expiryDate && (
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-medium">
                {subscriptionInfo.expiryDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </span>
            </div>
          )}

          {/* Warning for expiring/expired */}
          {(subscriptionInfo.status === "warning" || subscriptionInfo.status === "critical") && (
            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-700 dark:text-orange-400">
                Your subscription is expiring soon. Renew now to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          {subscriptionInfo.status === "expired" && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-400">
                Your subscription has expired. Cloud backup is disabled. Renew to restore backup functionality.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Renew Subscription Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">
              {subscriptionInfo.status === "none" ? "Activate Subscription" : "Renew Subscription"}
            </h4>

            {/* Option 1: Enter Code */}
            <div className="space-y-2">
              <Label htmlFor="subscriptionCode" className="flex items-center gap-1.5 text-xs">
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
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={handleActivateCode}
                  disabled={!subscriptionCode.trim() || activating}
                  size="sm"
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

            {/* Option 2: Pay with QRIS */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <QrCode className="h-3 w-3" />
                Pay with QRIS
              </Label>
              
              {!showQRIS ? (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DEVELOPER_QRIS.pricing).map(([months, price]) => (
                    <Button
                      key={months}
                      variant={selectedDuration === Number(months) ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col h-auto py-2"
                      onClick={() => {
                        setSelectedDuration(Number(months));
                        setShowQRIS(true);
                      }}
                    >
                      <span className="font-bold">{months} Month{Number(months) > 1 ? "s" : ""}</span>
                      <span className="text-xs opacity-80">{formatPriceIDR(price)}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border text-center">
                    <div className="bg-slate-100 rounded-lg p-4 mb-3">
                      {/* Placeholder for QRIS - In production, generate actual QR */}
                      <div className="w-48 h-48 mx-auto bg-slate-200 rounded flex items-center justify-center">
                        <QrCode className="h-24 w-24 text-slate-400" />
                      </div>
                    </div>
                    <p className="font-bold text-lg">
                      {formatPriceIDR(DEVELOPER_QRIS.pricing[selectedDuration])}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDuration} Month{selectedDuration > 1 ? "s" : ""} Subscription
                    </p>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      After payment, you will receive a subscription code via WhatsApp within 24 hours. 
                      Contact support if you don&apos;t receive it.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowQRIS(false)}
                  >
                    Back to Options
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin PIN Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {translate("settings.changeAdminPIN", language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPin">{translate("settings.currentPIN", language)}</Label>
            <Input
              id="currentPin"
              type="password"
              maxLength={6}
              placeholder="****"
              value={currentPin}
              onChange={(e) => onCurrentPinChange(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPin">{translate("settings.newPIN", language)}</Label>
            <Input
              id="newPin"
              type="password"
              maxLength={6}
              placeholder="****"
              value={newPin}
              onChange={(e) => onNewPinChange(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPin">{translate("settings.confirmPIN", language)}</Label>
            <Input
              id="confirmPin"
              type="password"
              maxLength={6}
              placeholder="****"
              value={confirmPin}
              onChange={(e) => onConfirmPinChange(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button 
            onClick={onChangePinSubmit} 
            className="w-full"
            disabled={!currentPin || !newPin || !confirmPin || newPin.length < 4}
          >
            {translate("settings.changePIN", language)}
          </Button>
        </CardContent>
      </Card>

      {/* Google Drive Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              {translate("settings.dataBackup", language)}
            </div>
            {isSignedIn && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {translate("settings.protected", language)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Backup blocked warning if expired */}
          {subscriptionInfo.status === "expired" && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-400 text-xs">
                Cloud backup is disabled due to expired subscription.
              </AlertDescription>
            </Alert>
          )}

          {!isSignedIn ? (
            <>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {translate("settings.backup.signInHint", language)}
                </AlertDescription>
              </Alert>
              <Button 
                onClick={onGoogleSignIn} 
                className="w-full" 
                size="sm"
                disabled={subscriptionInfo.status === "expired"}
              >
                <Cloud className="h-3 w-3 mr-2" />
                {translate("settings.backup.connect", language)}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                {backupStatus.lastBackupTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Backup:</span>
                    <span className="font-medium">
                      {new Date(backupStatus.lastBackupTime).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={backupStatus.isHealthy ? "default" : "secondary"} className={backupStatus.isHealthy ? "bg-green-500/10 text-green-700" : ""}>
                    {backupStatus.isHealthy ? "Healthy" : backupStatus.message}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={onBackupNow} 
                  className="flex-1" 
                  size="sm"
                  disabled={backupProcessing || subscriptionInfo.status === "expired"}
                >
                  {backupProcessing ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-2" />
                  )}
                  {translate("settings.backup.backupNow", language)}
                </Button>
                <Button 
                  onClick={onRestore} 
                  variant="outline" 
                  className="flex-1" 
                  size="sm"
                  disabled={restoreDisabled}
                >
                  <Download className="h-3 w-3 mr-2" />
                  {translate("settings.backup.restore", language)}
                </Button>
              </div>

              <Separator />

              <Button 
                onClick={onGoogleSignOut} 
                variant="ghost" 
                size="sm" 
                className="w-full text-muted-foreground"
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