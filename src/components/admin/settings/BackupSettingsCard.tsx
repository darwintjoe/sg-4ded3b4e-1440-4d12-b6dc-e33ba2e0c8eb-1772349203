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
} from "lucide-react";
import { translate } from "@/lib/translations";
import type { BackupStatus } from "@/types";

interface BackupSettingsCardProps {
  language: string;
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
  return (
    <div className="space-y-6">
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
          {!isSignedIn ? (
            <>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {translate("settings.backup.signInHint", language)}
                </AlertDescription>
              </Alert>
              <Button onClick={onGoogleSignIn} className="w-full" size="sm">
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
                  disabled={backupProcessing}
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