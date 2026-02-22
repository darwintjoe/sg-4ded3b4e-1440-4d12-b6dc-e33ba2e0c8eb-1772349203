import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestorePreviewDialog } from "@/components/RestorePreviewDialog";
import { useApp } from "@/contexts/AppContext";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { translate } from "@/lib/translations";
import type { Settings } from "@/types";
import { 
  Lock, 
  Cloud, 
  Upload, 
  Download, 
  CheckCircle2, 
  Info,
  Loader2,
  Store,
  Printer,
  Cog
} from "lucide-react";
import { BusinessSettingsSection } from "./settings/BusinessSettingsSection";
import { POSSettingsSection } from "./settings/POSSettingsSection";
import { PrinterSettingsSection } from "./settings/PrinterSettingsSection";
import { DatabaseManagementSection } from "./settings/DatabaseManagementSection";
import { sampleStoreData } from "@/lib/sample-store-data";

interface RestoreState {
  phase: "idle" | "loading" | "preview" | "restoring" | "complete" | "error";
  message?: string;
  backupData?: any;
}

interface PreviewDialog {
  open: boolean;
  backupData: any | null;
}

export default function SettingsPanel() {
  const { settings, updateSettings, language, logout } = useApp();
  const { 
    user, 
    isSignedIn, 
    isInitialized,
    signIn, 
    signOut,
    backupStatus,
    refreshBackupStatus,
    createBackup,
    checkBackupAvailability,
    startRestore,
    backupCurrentDatabase,
    loadPreview,
    finalizeRestore,
    cancelRestore,
    revertRestore,
    canRevert,
    promoteCandidate
  } = useGoogleAuth();
  const { toast } = useToast();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [backupProcessing, setBackupProcessing] = useState(false);
  const [restoreState, setRestoreState] = useState<RestoreState>({ phase: "idle" });
  const [previewDialog, setPreviewDialog] = useState<PreviewDialog>({ 
    open: false, 
    backupData: null 
  });

  const updateAndSave = async (updates: Partial<Settings>) => {
    setSaving(true);
    await updateSettings(updates);
    setTimeout(() => setSaving(false), 500);
  };

  const handleChangeAdminPin = async () => {
    if (newPin !== confirmPin) {
      toast({
        title: translate("settings.error", language),
        description: translate("settings.pinMismatch", language),
        variant: "destructive",
      });
      return;
    }

    if (newPin.length < 4) {
      toast({
        title: translate("settings.error", language),
        description: translate("settings.pinTooShort", language),
        variant: "destructive",
      });
      return;
    }

    try {
      const storedSettings = await db.getSettings();
      if (!storedSettings || storedSettings.adminPIN !== currentPin) {
        toast({
          title: translate("settings.error", language),
          description: translate("settings.incorrectCurrentPIN", language),
          variant: "destructive",
        });
        return;
      }

      await updateSettings({ adminPIN: newPin });
      toast({
        title: translate("settings.success", language),
        description: translate("settings.pinChanged", language),
      });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error) {
      toast({
        title: translate("settings.error", language),
        description: translate("settings.pinChangeFailed", language),
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await signIn();
    if (result.success) {
      toast({
        title: translate("settings.success", language),
        description: translate("settings.backup.connected", language),
      });
      await updateAndSave({
        googleDriveLinked: true,
        googleAccountEmail: result.user?.email
      });
    } else {
      toast({
        title: translate("settings.error", language),
        description: result.error || translate("settings.backup.connectionFailed", language),
        variant: "destructive",
      });
    }
  };

  const handleBackupNow = async () => {
    setBackupProcessing(true);
    try {
      const result = await createBackup();
      if (result.success) {
        toast({
          title: translate("settings.success", language),
          description: translate("settings.backup.backupCreated", language),
        });
        await refreshBackupStatus();
      } else {
        toast({
          title: translate("settings.error", language),
          description: result.error || translate("settings.backup.backupFailed", language),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: translate("settings.error", language),
        description: translate("settings.backup.backupFailed", language),
        variant: "destructive",
      });
    } finally {
      setBackupProcessing(false);
    }
  };

  const initiateRestore = async () => {
    setRestoreState({ phase: "loading", message: "Checking backup availability..." });

    const availability = await checkBackupAvailability();
    if (!availability.exists) {
      setRestoreState({ 
        phase: "error", 
        message: availability.error || "No backup found" 
      });
      toast({
        title: translate("settings.error", language),
        description: "No backup available to restore",
        variant: "destructive",
      });
      return;
    }

    const backupResult = await backupCurrentDatabase();
    if (!backupResult.success) {
      setRestoreState({ 
        phase: "error", 
        message: "Failed to backup current data" 
      });
      toast({
        title: translate("settings.error", language),
        description: "Failed to backup current database",
        variant: "destructive",
      });
      return;
    }

    const restoreResult = await startRestore();
    if (!restoreResult.success) {
      setRestoreState({ 
        phase: "error", 
        message: restoreResult.error || "Failed to load backup" 
      });
      toast({
        title: translate("settings.error", language),
        description: restoreResult.error || "Failed to load backup",
        variant: "destructive",
      });
      return;
    }

    setRestoreState({ 
      phase: "preview", 
      message: "Backup loaded. Review changes.",
      backupData: restoreResult.backupData
    });
  };

  const startPreviewProcess = async () => {
    if (!restoreState.backupData) {
      toast({
        title: translate("settings.error", language),
        description: "No backup data available",
        variant: "destructive",
      });
      return;
    }

    setPreviewDialog({ 
      open: true, 
      backupData: restoreState.backupData 
    });
  };

  const handleConfirmRestore = async () => {
    if (!previewDialog.backupData) return;

    setPreviewDialog({ open: false, backupData: null });
    setRestoreState({ phase: "restoring", message: "Restoring backup..." });

    const result = await finalizeRestore(previewDialog.backupData);
    
    if (result.success) {
      setRestoreState({ phase: "complete", message: "Restore complete!" });
      toast({
        title: translate("settings.success", language),
        description: "Database restored successfully. Logging out...",
      });
      
      setTimeout(() => {
        logout();
      }, 2000);
    } else {
      setRestoreState({ 
        phase: "error", 
        message: result.error || "Restore failed" 
      });
      toast({
        title: translate("settings.error", language),
        description: result.error || "Failed to restore backup",
        variant: "destructive",
      });
    }
  };

  const handleCancelRestore = async () => {
    await cancelRestore();
    setRestoreState({ phase: "idle" });
    setPreviewDialog({ open: false, backupData: null });
  };

  const handleRevertRestore = async () => {
    const result = await revertRestore();
    if (result.success) {
      toast({
        title: translate("settings.success", language),
        description: "Reverted to previous state successfully",
      });
      setTimeout(() => {
        logout();
      }, 2000);
    } else {
      toast({
        title: translate("settings.error", language),
        description: result.error || "Failed to revert",
        variant: "destructive",
      });
    }
  };

  const handleFactoryReset = async () => {
    const confirmed = window.confirm(
      translate("settings.database.factoryReset.confirm", language)
    );
    
    if (!confirmed) return;

    try {
      await db.clearAllStores();
      
      toast({
        title: translate("settings.success", language),
        description: translate("settings.database.factoryReset.success", language),
      });

      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error) {
      toast({
        title: translate("settings.error", language),
        description: translate("settings.database.factoryReset.failed", language),
        variant: "destructive",
      });
    }
  };

  const handleInjectSampleData = async (businessType: string) => {
    const confirmed = window.confirm(
      translate("settings.database.sampleData.confirm", language)
    );
    
    if (!confirmed) return;

    try {
      const data = sampleStoreData[businessType as keyof typeof sampleStoreData];
      
      if (!data) {
        throw new Error("Invalid business type");
      }

      await db.updateSettings({
        ...settings,
        ...data.settings,
      });

      await db.clear("items");
      for (const item of data.items) {
        await db.add("items", item);
      }

      await db.clear("employees");
      for (const employee of data.employees) {
        await db.add("employees", employee);
      }

      toast({
        title: translate("settings.success", language),
        description: translate("settings.database.sampleData.success", language),
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to inject sample data:", error);
      toast({
        title: translate("settings.error", language),
        description: translate("settings.database.sampleData.failed", language),
        variant: "destructive",
      });
    }
  };

  const handleClearTransactions = async () => {
    const confirmed = window.confirm(
      translate("settings.database.clearTransactions.confirm", language)
    );
    
    if (!confirmed) return;

    try {
      await db.clearTransactions();
      await db.clear("shifts");

      toast({
        title: translate("settings.success", language),
        description: translate("settings.database.clearTransactions.success", language),
      });
    } catch (error) {
      toast({
        title: translate("settings.error", language),
        description: translate("settings.database.clearTransactions.failed", language),
        variant: "destructive",
      });
    }
  };

  const renderRestoreUI = () => {
    if (restoreState.phase === "idle") return null;

    const revertInfo = canRevert();

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {restoreState.phase === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
              {restoreState.phase === "preview" && <Info className="h-5 w-5" />}
              {restoreState.phase === "restoring" && <Loader2 className="h-5 w-5 animate-spin" />}
              {restoreState.phase === "complete" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              Restore Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{restoreState.message}</p>
            
            {restoreState.phase === "preview" && (
              <div className="flex gap-2">
                <Button onClick={startPreviewProcess} className="flex-1">
                  Review Changes
                </Button>
                <Button onClick={handleCancelRestore} variant="outline">
                  Cancel
                </Button>
              </div>
            )}

            {restoreState.phase === "complete" && revertInfo.available && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You can revert this restore within {revertInfo.hoursRemaining?.toFixed(1)} hours
                </AlertDescription>
              </Alert>
            )}

            {restoreState.phase === "error" && (
              <Button onClick={handleCancelRestore} variant="outline" className="w-full">
                Close
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative">
      <Tabs defaultValue="business" className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger 
              value="business" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Store className="h-4 w-4 mr-2" />
              {translate("settings.tabs.business", language)}
            </TabsTrigger>
            <TabsTrigger 
              value="pos" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Cog className="h-4 w-4 mr-2" />
              {translate("settings.tabs.pos", language)}
            </TabsTrigger>
            <TabsTrigger 
              value="printer" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Printer className="h-4 w-4 mr-2" />
              {translate("settings.tabs.printer", language)}
            </TabsTrigger>
            <TabsTrigger 
              value="backup" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Cloud className="h-4 w-4 mr-2" />
              {translate("settings.tabs.backup", language)}
            </TabsTrigger>
            <TabsTrigger 
              value="database" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Lock className="h-4 w-4 mr-2" />
              {translate("settings.tabs.database", language)}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="business" className="h-[calc(100vh-150px)] overflow-y-auto space-y-4 p-4 mt-0 flex-1">
            <div className="h-full overflow-y-auto">
              <BusinessSettingsSection 
                settings={settings} 
                onUpdate={updateAndSave}
                language={language}
              />
            </div>
          </TabsContent>
          <TabsContent value="pos" className="h-[calc(100vh-150px)] overflow-y-auto space-y-4 p-4 mt-0">
            <POSSettingsSection 
              settings={settings} 
              onUpdate={updateAndSave}
              language={language}
            />
          </TabsContent>
          <TabsContent value="printer" className="h-[calc(100vh-150px)] overflow-y-auto space-y-4 p-4 mt-0">
            <PrinterSettingsSection 
              settings={settings} 
              onUpdate={updateAndSave}
              language={language}
            />
          </TabsContent>
          <TabsContent value="backup" className="h-[calc(100vh-150px)] overflow-y-auto space-y-4 p-4 mt-0">
            <div className="space-y-6">
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
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
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
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
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
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <Button 
                    onClick={handleChangeAdminPin} 
                    className="w-full"
                    disabled={!currentPin || !newPin || !confirmPin || newPin.length < 4}
                  >
                    {translate("settings.changePIN", language)}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-5 w-5" />
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
                  {!isInitialized ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{translate("common.loading", language)}</span>
                    </div>
                  ) : !isSignedIn ? (
                    <>
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {translate("settings.backup.signInHint", language)}
                        </AlertDescription>
                      </Alert>
                      <Button onClick={handleGoogleSignIn} className="w-full" size="sm">
                        <Cloud className="h-4 w-4 mr-2" />
                        {translate("settings.backup.connect", language)}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <img 
                          src={user?.picture} 
                          alt={user?.name} 
                          className="h-10 w-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user?.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                        </div>
                      </div>

                      {backupStatus && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{translate("settings.backup.lastBackup", language)}</span>
                            <span className={backupStatus.isHealthy ? "text-green-600" : "text-amber-600"}>
                              {backupStatus.lastBackupTime 
                                ? new Date(backupStatus.lastBackupTime).toLocaleString()
                                : translate("settings.backup.never", language)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{translate("settings.backup.status", language)}</span>
                            <Badge variant={backupStatus.isHealthy ? "default" : "secondary"}>
                              {backupStatus.message}
                            </Badge>
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={handleBackupNow} 
                        className="w-full" 
                        disabled={backupProcessing}
                      >
                        {backupProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {translate("settings.backup.backingUp", language)}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {translate("settings.backup.backupNow", language)}
                          </>
                        )}
                      </Button>

                      <Button 
                        variant="outline" 
                        onClick={() => {
                          signOut();
                          updateAndSave({
                            googleDriveLinked: false,
                            googleAccountEmail: undefined
                          });
                        }} 
                        className="w-full"
                        size="sm"
                      >
                        {translate("settings.backup.disconnect", language)}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {isSignedIn && backupStatus?.canRestore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      {translate("settings.backup.restore", language)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {translate("settings.backup.restoreHint", language)}
                      </AlertDescription>
                    </Alert>
                    <Button 
                      variant="outline" 
                      onClick={initiateRestore} 
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {translate("settings.backup.startRestore", language)}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="database" className="h-[calc(100vh-150px)] overflow-y-auto space-y-4 p-4 mt-0">
            <DatabaseManagementSection 
              language={language}
              onFactoryReset={handleFactoryReset}
              onInjectSampleData={handleInjectSampleData}
              onClearTransactions={handleClearTransactions}
              onInitiateRestore={initiateRestore}
              restoreState={restoreState}
              backupProcessing={backupProcessing}
              handleBackupNow={handleBackupNow}
              isSignedIn={isSignedIn}
              backupStatus={backupStatus}
              startPreviewProcess={startPreviewProcess}
            />
          </TabsContent>
        </div>
      </Tabs>
      {saving && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded">
          Saving...
        </div>
      )}
      {renderRestoreUI()}
      <RestorePreviewDialog
        open={previewDialog.open}
        backupData={previewDialog.backupData}
        onClose={() => {
          setPreviewDialog({ open: false, backupData: null });
          setRestoreState({ phase: "idle" });
        }}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}