import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/contexts/AppContext";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { backupService } from "@/lib/backup-service";
import { Settings } from "@/types";
import {
  Store,
  DollarSign,
  Shield,
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle2,
  Cloud,
  Upload,
  Download,
  RefreshCw,
  Lock,
  Eye,
  AlertTriangle,
  RotateCcw,
  Info,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/db";
import { generateSampleStoreData } from "@/lib/sample-store-data";
import { useToast } from "@/hooks/use-toast";
import { RestorePreviewDialog } from "@/components/RestorePreviewDialog";
import { translate } from "@/lib/translations";

// Extracted components
import { HelpTooltip } from "./settings/HelpTooltip";
import { ProgressDialog } from "./settings/ProgressDialog";
import { BusinessSettingsSection } from "./settings/BusinessSettingsSection";
import { PrinterSettingsSection } from "./settings/PrinterSettingsSection";
import { POSSettingsSection } from "./settings/POSSettingsSection";
import { DatabaseManagementSection } from "./settings/DatabaseManagementSection";

export function SettingsPanel() {
  const { settings: currentSettings, updateSettings, language, loginAdmin } = useApp();
  const { 
    user, 
    isSignedIn, 
    isInitialized, 
    signIn, 
    signOut,
    backupStatus,
    refreshBackupStatus,
    createBackup,
    startRestore,
    backupCurrentDatabase,
    finalizeRestore,
    cancelRestore,
    revertRestore,
    canRevert
  } = useGoogleAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [saving, setSaving] = useState(false);
  const [backupProcessing, setBackupProcessing] = useState(false);
  const [restoreState, setRestoreState] = useState<{
    phase: "idle" | "auth" | "checking" | "confirm_impact" | "downloading" | "preview" | "final_confirm" | "restoring" | "success" | "error";
    error?: string;
    backupInfo?: any;
    progress?: number;
    pin?: string;
  }>({ phase: "idle" });

  const [activeTab, setActiveTab] = useState<string>("business");
  const [revertStatus, setRevertStatus] = useState<{ available: boolean; hoursRemaining: number | null }>({ 
    available: false, 
    hoursRemaining: null 
  });

  const [progressDialog, setProgressDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    progress?: number;
    total?: number;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    backupData: any | null;
  }>({ open: false, backupData: null });

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleAutoSave = async (newSettings: Settings) => {
    setSaving(true);
    try {
      await updateSettings(newSettings);
    } catch (error) {
      console.error("Failed to auto-save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateAndSave = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    handleAutoSave(newSettings);
  };

  // DATABASE MANAGEMENT HANDLERS
  const handleFactoryReset = async () => {
    if (!window.confirm(
      "🔴 FACTORY RESET - DANGER!\n\n" +
      "This will DELETE EVERYTHING:\n" +
      "• All items and inventory\n" +
      "• All employees\n" +
      "• All transactions and sales\n" +
      "• All reports and summaries\n" +
      "• All settings\n\n" +
      "THIS ACTION CANNOT BE UNDONE!"
    )) return;

    if (!window.confirm(
      "🔴 FINAL WARNING!\n\n" +
      "Click OK to permanently delete everything.\n\n" +
      "Click Cancel to keep your current data."
    )) return;

    setProgressDialog({
      isOpen: true,
      title: "Factory Reset",
      message: "Resetting database to factory defaults...",
    });

    try {
      await db.closeAndReset();
      await new Promise(resolve => setTimeout(resolve, 200));

      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase("SellMoreDB");
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = (e) => reject(new Error("Failed to delete database"));
        deleteRequest.onblocked = () => reject(new Error("Database deletion blocked. Please close all other tabs."));
      });

      setProgressDialog(prev => ({ ...prev, message: "Factory reset complete! Reloading..." }));
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Factory reset failed:", error);
      setProgressDialog({ isOpen: false, title: "", message: "" });
      alert("❌ Factory reset failed:\n\n" + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleInjectSampleData = async () => {
    if (!confirm("This will add sample data to your database. Continue?")) return;

    try {
      setProgressDialog({
        isOpen: true,
        title: "Loading Sample Data",
        message: "Preparing sample data...",
      });

      const data = generateSampleStoreData();
      let itemsAdded = 0, itemsSkipped = 0;
      let employeesAdded = 0, employeesSkipped = 0;
      let transactionsAdded = 0, transactionsSkipped = 0;
      let dailySummariesAdded = 0, monthlySummariesAdded = 0;

      // Add Items
      setProgressDialog(prev => ({ 
        ...prev, 
        message: "Loading items...",
        progress: 0,
        total: data.items.length
      }));
      
      for (let i = 0; i < data.items.length; i++) {
        try {
          await db.add("items", { ...data.items[i], createdAt: Date.now() });
          itemsAdded++;
        } catch (e: any) {
          if (e.name === "ConstraintError") itemsSkipped++;
          else throw e;
        }
        if (i % 20 === 0) setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
      }
      
      // Add Employees
      setProgressDialog(prev => ({ 
        ...prev, 
        message: "Loading employees...",
        progress: 0,
        total: data.employees.length
      }));
      
      for (let i = 0; i < data.employees.length; i++) {
        try {
          await db.add("employees", data.employees[i]);
          employeesAdded++;
        } catch (e: any) {
          if (e.name === "ConstraintError") employeesSkipped++;
          else throw e;
        }
        setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
      }
      
      // Add Transactions
      const txnBatchSize = 500;
      setProgressDialog(prev => ({ 
        ...prev, 
        message: "Loading transactions...",
        progress: 0,
        total: data.transactions.length
      }));
      
      for (let i = 0; i < data.transactions.length; i += txnBatchSize) {
        const batch = data.transactions.slice(i, i + txnBatchSize);
        
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("SellMoreDB", 4);
          request.onsuccess = () => {
            const idb = request.result;
            const tx = idb.transaction(["transactions"], "readwrite");
            const store = tx.objectStore("transactions");
            
            for (const txn of batch) {
              const addRequest = store.add(txn);
              addRequest.onsuccess = () => transactionsAdded++;
              addRequest.onerror = (e: any) => {
                if (e.target?.error?.name === "ConstraintError") transactionsSkipped++;
              };
            }
            
            tx.oncomplete = () => { idb.close(); resolve(); };
            tx.onerror = () => { idb.close(); reject(tx.error); };
          };
          request.onerror = () => reject(request.error);
        });
        
        setProgressDialog(prev => ({ ...prev, progress: Math.min(i + txnBatchSize, data.transactions.length) }));
      }
      
      // Add Daily Summaries
      setProgressDialog(prev => ({ 
        ...prev, 
        message: "Processing daily summaries...",
        progress: 0,
        total: data.dailySummaries.length
      }));
      
      for (let i = 0; i < data.dailySummaries.length; i++) {
        await db.upsertDailyPaymentSales(data.dailySummaries[i]);
        dailySummariesAdded++;
        if (i % 50 === 0) setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
      }
      
      // Add Daily Item Sales
      setProgressDialog(prev => ({ 
        ...prev, 
        message: "Processing daily item sales...",
        progress: 0,
        total: data.dailyItemSales?.length || 0
      }));
      
      if (data.dailyItemSales) {
        for (let i = 0; i < data.dailyItemSales.length; i++) {
          await db.upsertDailyItemSales(data.dailyItemSales[i]);
          if (i % 50 === 0) setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
        }
      }
      
      // Add Monthly Summaries
      setProgressDialog(prev => ({ 
        ...prev, 
        message: "Processing monthly summaries...",
        progress: 0,
        total: data.monthlySummaries.payments.length + data.monthlySummaries.summary.length + (data.monthlyItemSales?.length || 0)
      }));
      
      let monthlySummaryProgress = 0;
      for (const summary of data.monthlySummaries.payments) {
        await db.upsertMonthlyPaymentSales(summary);
        monthlySummariesAdded++;
        monthlySummaryProgress++;
        setProgressDialog(prev => ({ ...prev, progress: monthlySummaryProgress }));
      }

      for (const summary of data.monthlySummaries.summary) {
        await db.upsertMonthlySalesSummary(summary);
        monthlySummaryProgress++;
        setProgressDialog(prev => ({ ...prev, progress: monthlySummaryProgress }));
      }
      
      if (data.monthlyItemSales) {
        for (const itemSales of data.monthlyItemSales) {
          await db.upsertMonthlyItemSales(itemSales);
          monthlySummaryProgress++;
          setProgressDialog(prev => ({ ...prev, progress: monthlySummaryProgress }));
        }
      }

      if (data.monthlyAttendanceSummaries) {
        for (const summary of data.monthlyAttendanceSummaries) {
          await db.add("monthlyAttendanceSummary", summary);
        }
      }

      if (data.dailyAttendance) {
        for (const record of data.dailyAttendance) {
          await db.add("dailyAttendance", record);
        }
      }

      await db.updateSettings(data.settings);

      setProgressDialog({ isOpen: false, title: "", message: "" });

      const report = [
        "✅ Sample Data Loaded Successfully!\n",
        `📦 Items: ${itemsAdded} added${itemsSkipped > 0 ? `, ${itemsSkipped} skipped` : ""}`,
        `👥 Employees: ${employeesAdded} added${employeesSkipped > 0 ? `, ${employeesSkipped} skipped` : ""}`,
        `💰 Transactions: ${transactionsAdded.toLocaleString()} added${transactionsSkipped > 0 ? `, ${transactionsSkipped.toLocaleString()} skipped` : ""}`,
        `📊 Daily Summaries: ${dailySummariesAdded} added`,
        `📊 Daily Item Sales: ${data.dailyItemSales?.length || 0} added`,
        `📈 Monthly Summaries: ${monthlySummariesAdded} added`,
        `📈 Monthly Item Sales: ${data.monthlyItemSales?.length || 0} added`,
        "\nClick OK to reload and see your data..."
      ].join("\n");

      alert(report);
      window.location.reload();
    } catch (error) {
      console.error("Sample data injection error:", error);
      setProgressDialog({ isOpen: false, title: "", message: "" });
      alert("Failed to load sample data:\n\n" + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleClearTransactions = async () => {
    if (!window.confirm(
      "⚠️ Clear All Transaction Data?\n\n" +
      "This will permanently delete:\n" +
      "• All sales transactions\n" +
      "• All reports and summaries\n" +
      "• All attendance records\n\n" +
      "Items, employees, and settings will be kept.\n\n" +
      "This action cannot be undone!"
    )) return;

    if (!window.confirm(
      "🔶 FINAL CONFIRMATION\n\n" +
      "Are you absolutely sure?\n\n" +
      "Click OK to clear all transaction data."
    )) return;

    try {
      setProgressDialog({
        isOpen: true,
        title: "Clearing Transaction Data",
        message: "Removing all transactions and reports...",
      });

      await db.clearTransactions();
      await db.clearDailySummaries();
      await db.clearMonthlySummaries();
      await db.clearAttendance();
      
      setProgressDialog(prev => ({ ...prev, message: "Transaction data cleared! Reloading..." }));
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error(error);
      setProgressDialog({ isOpen: false, title: "", message: "" });
      toast({
        title: "Error",
        description: "Failed to clear transactions",
        variant: "destructive",
      });
    }
  };

  // GOOGLE AUTH HANDLERS
  const handleGoogleSignIn = async () => {
    const result = await signIn();
    if (result.success && result.user) {
      updateAndSave({
        googleDriveLinked: true,
        googleAccountEmail: result.user.email
      });
    }
  };

  const handleBackupNow = async () => {
    setBackupProcessing(true);
    try {
      const result = await createBackup();
      if (result.success) {
        await refreshBackupStatus();
      } else {
        alert(result.error || "Backup failed");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBackupProcessing(false);
    }
  };

  // RESTORE FLOW HANDLERS
  const initiateRestore = () => {
    setRestoreState({ phase: "auth", pin: "" });
  };

  const handleManualFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreState({ phase: "auth", pin: "" });
  };

  const verifyPinAndCheckBackup = async () => {
    if (!restoreState.pin || restoreState.pin.length < 4 || restoreState.pin.length > 6) {
      setRestoreState(prev => ({ ...prev, error: "PIN must be 4-6 digits" }));
      return;
    }

    const success = await loginAdmin(restoreState.pin);
    if (!success) {
      setRestoreState(prev => ({ ...prev, error: "Incorrect Admin PIN", pin: "" }));
      return;
    }

    setRestoreState(prev => ({ ...prev, phase: "checking", error: undefined }));
    
    try {
      const fileInput = document.getElementById("manual-backup-upload") as HTMLInputElement;
      const manualFile = fileInput?.files?.[0];

      if (manualFile) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            
            let jsonData;
            if (manualFile.name.endsWith(".gz")) {
              const decompressed = await decompressGzip(new Uint8Array(arrayBuffer));
              jsonData = JSON.parse(new TextDecoder().decode(decompressed));
            } else {
              jsonData = JSON.parse(new TextDecoder().decode(arrayBuffer));
            }

            if (!jsonData.items || !jsonData.employees || !jsonData.settings) {
              throw new Error("Invalid backup file format");
            }

            const backupInfo = {
              timestamp: jsonData.timestamp || new Date().toISOString(),
              size: arrayBuffer.byteLength,
              itemCount: jsonData.items?.length || 0,
              employeeCount: jsonData.employees?.length || 0,
              source: "manual_upload"
            };

            backupService.storeBackupForPreview(jsonData);

            setRestoreState(prev => ({ 
              ...prev, 
              phase: "confirm_impact", 
              backupInfo 
            }));
          } catch (err) {
            setRestoreState(prev => ({ 
              ...prev, 
              phase: "error", 
              error: err instanceof Error ? err.message : "Failed to read backup file" 
            }));
          }
        };
        reader.readAsArrayBuffer(manualFile);
        return;
      }

      const restoreResult = await startRestore();
      if (!restoreResult.success || !restoreResult.backupData) {
        throw new Error(restoreResult.error || "Download failed");
      }

      await backupCurrentDatabase();
      setRestoreState(prev => ({ ...prev, progress: 75 }));

      await loadPreviewLocal(restoreResult.backupData);
      setRestoreState(prev => ({ ...prev, progress: 100, phase: "preview" }));
    } catch (err) {
      setRestoreState(prev => ({ 
        ...prev, 
        phase: "error", 
        error: err instanceof Error ? err.message : "Preview failed" 
      }));
    }
  };

  const decompressGzip = async (data: Uint8Array): Promise<Uint8Array> => {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  };

  const loadPreviewLocal = async (backupData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      setRestoreState(prev => ({ ...prev, phase: "preview", progress: 95 }));
      backupService.storeBackupForPreview(backupData);
      setRestoreState(prev => ({ ...prev, progress: 100, previewDBName: "preview" }));
      return { success: true };
    } catch (error) {
      console.error("Failed to load preview:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Preview load failed" 
      };
    }
  };

  const startPreviewProcess = async () => {
    setRestoreState(prev => ({ ...prev, phase: "downloading", progress: 0 }));
    
    try {
      const manualData = backupService.getStoredBackup();
      
      let backupData;
      if (manualData) {
        backupData = manualData;
        setRestoreState(prev => ({ ...prev, progress: 50 }));
      } else {
        const restoreResult = await startRestore();
        if (!restoreResult.success || !restoreResult.backupData) {
          throw new Error(restoreResult.error || "Download failed");
        }
        backupData = restoreResult.backupData;
        setRestoreState(prev => ({ ...prev, progress: 50 }));
      }

      await backupCurrentDatabase();
      setRestoreState(prev => ({ ...prev, progress: 75 }));

      if (backupData && !manualData) {
        backupService.storeBackupForPreview(backupData);
      }
      
      setRestoreState(prev => ({ ...prev, progress: 100, phase: "preview" }));
      setPreviewDialog({ open: true, backupData });
      setRestoreState({ phase: "idle" });
    } catch (err) {
      setRestoreState(prev => ({ 
        ...prev, 
        phase: "error", 
        error: err instanceof Error ? err.message : "Preview failed" 
      }));
    }
  };

  const finalizeRestoreProcess = async () => {
    setRestoreState(prev => ({ ...prev, phase: "restoring" }));
    
    try {
      const previewData = backupService.getStoredBackup();
      if (!previewData) throw new Error("Preview data lost");

      backupService.clearStoredBackup();
      sessionStorage.removeItem("preview_mode");

      const result = await finalizeRestore(previewData);
      
      if (result.success) {
        setRestoreState(prev => ({ ...prev, phase: "success" }));
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setRestoreState(prev => ({ 
        ...prev, 
        phase: "error", 
        error: err instanceof Error ? err.message : "Restore failed" 
      }));
    }
  };

  const handleCancelRestore = async () => {
    await cancelRestore();
    setRestoreState({ phase: "idle" });
    if (sessionStorage.getItem("preview_mode")) {
      window.location.reload();
    }
  };

  const handleRevert = async () => {
    if (!window.confirm("Revert to the state before the last restore? This will replace current data.")) return;
    
    try {
      const result = await revertRestore();
      if (result.success) {
        alert("Revert successful. Reloading...");
        window.location.reload();
      } else {
        alert("Revert failed: " + result.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmRestore = async () => {
    try {
      const previewData = backupService.getStoredBackup();
      if (!previewData) throw new Error("Backup preview data not found");

      setPreviewDialog({ open: false, backupData: null });
      setRestoreState({ phase: "restoring" });
      
      backupService.clearStoredBackup();
      sessionStorage.removeItem("preview_mode");

      const result = await finalizeRestore(previewData);
      
      if (result.success) {
        setRestoreState({ phase: "success" });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setRestoreState({ 
        phase: "error", 
        error: err instanceof Error ? err.message : "Restore failed" 
      });
    }
  };

  // RENDER RESTORE UI
  const renderRestoreUI = () => {
    if (restoreState.phase === "idle") return null;

    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-2 border-primary/20">
          
          {restoreState.phase === "auth" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <Lock className="h-6 w-6" />
                <h2 className="text-xl font-bold">Admin Access Required</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter Admin PIN to access emergency restore functions.
              </p>
              
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

              <div className="w-full max-w-[280px] mx-auto">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        if ((restoreState.pin?.length || 0) < 6) {
                          setRestoreState(p => ({...p, pin: (p.pin || "") + num.toString(), error: undefined}));
                        }
                      }}
                      className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-muted hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-border"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setRestoreState(p => ({...p, pin: p.pin?.slice(0, -1) || "", error: undefined}))}
                    className="h-14 w-14 mx-auto rounded-full text-lg bg-muted hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-border"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => {
                      if ((restoreState.pin?.length || 0) < 6) {
                        setRestoreState(p => ({...p, pin: (p.pin || "") + "0", error: undefined}));
                      }
                    }}
                    className="h-14 w-14 mx-auto rounded-full text-xl font-bold bg-muted hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-xl border border-border"
                  >
                    0
                  </button>
                  <button
                    onClick={verifyPinAndCheckBackup}
                    disabled={(restoreState.pin?.length || 0) < 4}
                    className="h-14 w-14 mx-auto rounded-full text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                  >
                    ✓
                  </button>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <Button variant="ghost" size="sm" onClick={handleCancelRestore}>Cancel</Button>
              </div>
            </div>
          )}

          {restoreState.phase === "error" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <h2 className="text-xl font-bold">Restore Failed</h2>
              </div>
              <p className="text-base font-medium">{restoreState.error}</p>
              <Button className="w-full" onClick={handleCancelRestore}>Close</Button>
            </div>
          )}

          {restoreState.phase === "checking" && (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p>Checking Google Drive...</p>
            </div>
          )}

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
                <Button variant="ghost" onClick={handleCancelRestore}>Cancel</Button>
                <Button onClick={startPreviewProcess}>Continue to Preview</Button>
              </div>
            </div>
          )}

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
  };

  // PREVIEW MODE RENDER
  if (restoreState.phase === "preview") {
    const previewData = backupService.getStoredBackup();

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="bg-amber-500 text-black px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 font-bold">
            <Eye className="h-5 w-5" />
            <span>PREVIEW MODE - Reviewing Backup Data</span>
          </div>
          <div className="flex gap-3">
             <Button variant="destructive" size="sm" onClick={handleCancelRestore}>
               Cancel Restore
             </Button>
             <Button variant="default" size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => setRestoreState(p => ({...p, phase: "final_confirm"}))}>
               <CheckCircle2 className="h-4 w-4 mr-2" />
               Apply Restore
             </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
           <div className="p-8 max-w-4xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <Store className="h-16 w-16 text-amber-500 mx-auto" />
                <h1 className="text-2xl font-bold">Backup Preview</h1>
                <p className="text-muted-foreground">
                  Review the data before applying the restore.
                </p>
              </div>

              {previewData && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="text-3xl font-bold text-primary">{previewData.items?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Items</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-3xl font-bold text-primary">{previewData.employees?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Employees</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-3xl font-bold text-primary">{previewData.categories?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Categories</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-3xl font-bold text-primary">{previewData.shifts?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Shifts</div>
                  </Card>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This data will replace your current database when you click "Apply Restore".
                </AlertDescription>
              </Alert>
           </div>
        </div>
        {renderRestoreUI()} 
      </div>
    );
  }

  // NORMAL RENDER
  return (
    <div className="h-full flex flex-col relative">
      {renderRestoreUI()}
      
      <ProgressDialog 
        isOpen={progressDialog.isOpen}
        title={progressDialog.title}
        message={progressDialog.message}
        progress={progressDialog.progress}
        total={progressDialog.total}
      />
      
      <div className="sticky top-0 z-10 bg-background border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 rounded-none h-12">
            <TabsTrigger value="business" className="gap-2 text-xs sm:text-sm">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">{translate("settings.tabs.business", language)}</span>
            </TabsTrigger>
            <TabsTrigger value="pos" className="gap-2 text-xs sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{translate("settings.tabs.pos", language)}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{translate("settings.tabs.security", language)}</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2 text-xs sm:text-sm">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{translate("settings.tabs.advanced", language)}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="business" className="space-y-4 p-4 mt-0">
            <BusinessSettingsSection 
              settings={settings} 
              onUpdate={updateAndSave}
              language={language}
            />
            <PrinterSettingsSection 
              settings={settings} 
              onUpdate={updateAndSave}
            />
          </TabsContent>

          <TabsContent value="pos" className="space-y-4 p-4 mt-0">
            <POSSettingsSection 
              settings={settings} 
              onUpdate={updateAndSave}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-4 p-4 mt-0">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {translate("settings.security.accessControl", language)}
              </h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {translate("settings.security.roleBased", language)}
                </AlertDescription>
              </Alert>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {translate("settings.security.dataPrivacy", language)}
              </h3>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>✓ {translate("settings.security.localData", language)}</div>
                <div>✓ {translate("settings.security.noServer", language)}</div>
                <div>✓ {translate("settings.security.fullControl", language)}</div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 p-4 mt-0">
            <DatabaseManagementSection
              onInjectSampleData={handleInjectSampleData}
              onClearTransactions={handleClearTransactions}
              onFactoryReset={handleFactoryReset}
              isProcessing={progressDialog.isOpen}
            />

            <Separator className="my-6" />

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  {translate("settings.backup.title", language)}
                </h3>
                {isSignedIn && backupStatus.isHealthy && (
                  <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {translate("settings.backup.safe", language)}
                  </Badge>
                )}
              </div>

              {!isInitialized ? (
                <div className="text-sm text-muted-foreground">{translate("common.loading", language)}</div>
              ) : !isSignedIn ? (
                <div className="space-y-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {translate("settings.backup.signInHint", language)}
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleGoogleSignIn} className="w-full" size="sm">
                    <Cloud className="h-3 w-3 mr-2" />
                    {translate("settings.backup.connect", language)}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      {user?.picture && (
                        <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" />
                      )}
                      <div className="text-sm">
                        <div className="font-medium">{user?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {backupStatus.lastBackupTime 
                            ? `${translate("settings.backup.lastBackup", language)} ${new Date(backupStatus.lastBackupTime).toLocaleString()}`
                            : translate("settings.backup.noBackup", language)}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-xs h-8">
                      {translate("settings.backup.disconnect", language)}
                    </Button>
                  </div>

                  <Button
                    onClick={handleBackupNow}
                    disabled={backupProcessing}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {backupProcessing ? (
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3 mr-2" />
                    )}
                    {translate("settings.backup.backupNow", language)}
                  </Button>
                  
                  <div className="pt-6 border-t mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> {translate("settings.backup.emergency", language)}
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      <input
                        id="manual-backup-upload"
                        type="file"
                        accept=".json,.gz"
                        onChange={handleManualFileUpload}
                        className="hidden"
                      />
                      
                      <Button
                        onClick={() => {
                          const input = document.getElementById("manual-backup-upload") as HTMLInputElement;
                          input?.click();
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        <Upload className="h-3 w-3 mr-2" />
                        {translate("settings.backup.upload", language)}
                      </Button>
                      
                      <Button
                        onClick={initiateRestore}
                        variant="destructive"
                        size="sm"
                        className="w-full bg-red-100 text-red-900 hover:bg-red-200 border-red-200"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        {translate("settings.backup.restore", language)}
                      </Button>
                      
                      {revertStatus.available && (
                        <Button
                          onClick={handleRevert}
                          variant="outline"
                          size="sm"
                          className="w-full border-amber-500 text-amber-600 hover:bg-amber-50"
                        >
                          <RotateCcw className="h-3 w-3 mr-2" />
                          {translate("settings.backup.revert", language)} ({revertStatus.hoursRemaining}h left)
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      {translate("settings.backup.advancedHint", language)}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {saving && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded">
          Saving...
        </div>
      )}
      
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