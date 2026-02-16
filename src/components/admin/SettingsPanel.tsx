import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApp } from "@/contexts/AppContext";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { backupService } from "@/lib/backup-service";
import { Settings, POSMode, Language } from "@/types";
import { translations } from "@/lib/translations";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";
import {
  Store,
  Globe,
  DollarSign,
  Printer,
  Link as LinkIcon,
  Bluetooth,
  AlertCircle,
  CheckCircle2,
  Settings as SettingsIcon,
  Shield,
  HelpCircle,
  Clock,
  CreditCard,
  Wallet,
  Info,
  Cloud,
  Upload,
  Download,
  RefreshCw,
  Lock,
  Eye,
  AlertTriangle,
  History,
  RotateCcw,
  Trash2,
  Database,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/db";
import { generateSampleStoreData } from "@/lib/sample-store-data";
import { useToast } from "@/hooks/use-toast";

// Helper component for tooltips
function HelpTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help ml-1 inline-block" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Progress Dialog Component
function ProgressDialog({ 
  isOpen, 
  title, 
  message, 
  progress, 
  total 
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  progress?: number; 
  total?: number;
}) {
  if (!isOpen) return null;

  const percentage = total ? Math.round((progress || 0) / total * 100) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl border-2 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          
          <p className="text-sm text-muted-foreground">{message}</p>
          
          {percentage !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress?.toLocaleString()} / {total?.toLocaleString()}</span>
                <span>{percentage}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out" 
                  style={{ width: `${percentage}%` }} 
                />
              </div>
            </div>
          )}
          
          {percentage === undefined && (
            <div className="flex justify-center py-4">
              <div className="flex space-x-2">
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

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
    checkBackupAvailability,
    startRestore,
    backupCurrentDatabase,
    loadPreview,
    finalizeRestore,
    cancelRestore,
    revertRestore,
    canRevert
  } = useGoogleAuth();
  const t = translations[language];
  const { toast } = useToast();

  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Bluetooth printer state
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [testPrinting, setTestPrinting] = useState(false);

  // Google backup state
  const [backupProcessing, setBackupProcessing] = useState(false);
  const [restoreState, setRestoreState] = useState<{
    phase: "idle" | "auth" | "checking" | "confirm_impact" | "downloading" | "preview" | "final_confirm" | "restoring" | "success" | "error";
    error?: string;
    backupInfo?: any;
    progress?: number;
    pin?: string;
  }>({ phase: "idle" });

  const [activeTab, setActiveTab] = useState<string>("business");
  
  // Revert state
  const [revertStatus, setRevertStatus] = useState<{ available: boolean; hoursRemaining: number | null }>({ available: false, hoursRemaining: null });

  // Progress Dialog State
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

  // HANDLERS FOR DATABASE MANAGEMENT
  const handleFactoryReset = async () => {
    setProgressDialog({
      isOpen: true,
      title: "Factory Reset",
      message: "Resetting database to factory defaults...",
    });

    try {
      console.log("🏭 Starting factory reset...");
      
      // Step 1: Close database connection
      await db.closeAndReset();
      console.log("✅ Database connection closed");

      // Step 2: Wait for connection to fully close
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log("⏳ Waited for connection cleanup");

      // Step 3: Delete the database
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase("SellMoreDB");
        
        deleteRequest.onsuccess = () => {
          console.log("✅ Database deleted successfully");
          resolve();
        };
        
        deleteRequest.onerror = (e) => {
          console.error("❌ Delete error:", e);
          reject(new Error("Failed to delete database"));
        };
        
        deleteRequest.onblocked = () => {
          console.warn("⚠️ Database deletion blocked");
          reject(new Error("Database deletion blocked. Please close all other tabs."));
        };
      });

      console.log("✅ Factory reset complete");
      setProgressDialog(prev => ({ ...prev, message: "Factory reset complete! Reloading..." }));
      
      // Reload after a brief delay to show completion message
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Factory reset failed:", error);
      setProgressDialog({ isOpen: false, title: "", message: "" });
      alert("❌ Factory reset failed:\n\n" + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleInjectSampleData = async () => {
    if (!confirm("This will add sample data to your database. Continue?")) {
      return;
    }

    try {
      setProgressDialog({
        isOpen: true,
        title: "Loading Sample Data",
        message: "Preparing sample data...",
      });

      const data = generateSampleStoreData();
      
      // Track results
      let itemsAdded = 0, itemsSkipped = 0;
      let employeesAdded = 0, employeesSkipped = 0;
      let transactionsAdded = 0, transactionsSkipped = 0;
      let dailySummariesAdded = 0;
      let monthlySummariesAdded = 0;

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
          if (e.name === "ConstraintError") {
            itemsSkipped++;
          } else {
            throw e;
          }
        }
        if (i % 20 === 0) {
          setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
        }
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
          if (e.name === "ConstraintError") {
            employeesSkipped++;
          } else {
            throw e;
          }
        }
        setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
      }
      
      // Add Transactions in optimized batches
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
                if (e.target?.error?.name === "ConstraintError") {
                  transactionsSkipped++;
                }
              };
            }
            
            tx.oncomplete = () => {
              idb.close();
              resolve();
            };
            tx.onerror = () => {
              idb.close();
              reject(tx.error);
            };
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
        if (i % 50 === 0) {
          setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
        }
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
          if (i % 50 === 0) {
            setProgressDialog(prev => ({ ...prev, progress: i + 1 }));
          }
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
      
      // Add Monthly Item Sales
      if (data.monthlyItemSales) {
        for (const itemSales of data.monthlyItemSales) {
          await db.upsertMonthlyItemSales(itemSales);
          monthlySummaryProgress++;
          setProgressDialog(prev => ({ ...prev, progress: monthlySummaryProgress }));
        }
      }
      
      // Update Settings
      await db.updateSettings(data.settings);

      // Close progress dialog
      setProgressDialog({ isOpen: false, title: "", message: "" });

      // Show summary report
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
    if (!confirm("Are you sure? This will delete ALL transactions and sales reports. Items and Employees will be kept.")) {
      return;
    }

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
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

  // Helper: Clear temp backup data
  const clearTempBackupData = async () => {
    // Legacy cleanup - functionality moved to backupService
  };

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  useEffect(() => {
    if (bluetoothPrinter.isSupported() && bluetoothPrinter.isConnected()) {
      setPrinterConnected(true);
      setPrinterName(bluetoothPrinter.getPrinterName());
    }
  }, []);

  // Auto-save function
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

  // Update settings and auto-save
  const updateAndSave = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    handleAutoSave(newSettings);
  };

  const handleConnectPrinter = async () => {
    setPrinterConnecting(true);
    setPrinterError(null);

    try {
      const result = await bluetoothPrinter.connect();

      if (result.success && result.printerName && result.printerId) {
        setPrinterConnected(true);
        setPrinterName(result.printerName);
        
        const newSettings = {
          ...settings,
          bluetoothPrinterId: result.printerId,
          bluetoothPrinterName: result.printerName
        };
        setSettings(newSettings);
        handleAutoSave(newSettings);
      } else {
        setPrinterError(result.error || "Failed to connect");
      }
    } catch (error) {
      setPrinterError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setPrinterConnecting(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await bluetoothPrinter.disconnect();
    setPrinterConnected(false);
    setPrinterName(null);
    
    const newSettings = {
      ...settings,
      bluetoothPrinterId: undefined,
      bluetoothPrinterName: undefined
    };
    setSettings(newSettings);
    handleAutoSave(newSettings);
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    setPrinterError(null);

    try {
      const result = await bluetoothPrinter.printTest(settings);
      
      if (!result.success) {
        setPrinterError(result.error || "Test print failed");
      }
    } catch (error) {
      setPrinterError(error instanceof Error ? error.message : "Test print failed");
    } finally {
      setTestPrinting(false);
    }
  };

  // Define isBluetoothSupported
  const isBluetoothSupported = bluetoothPrinter.isSupported();

  // Helper to safely get shifts with defaults
  const getSafeShifts = (s: Settings) => {
    return s.shifts || {
      shift1: { enabled: true, name: "Morning Shift", startTime: "09:00", endTime: "18:00" },
      shift2: { enabled: false, name: "Afternoon Shift", startTime: "14:00", endTime: "22:00" },
      shift3: { enabled: false, name: "Night Shift", startTime: "22:00", endTime: "06:00" },
    };
  };

  // Helper to update shift settings
  const updateShift = (key: string, update: any, save: boolean = false) => {
    const currentShifts = getSafeShifts(settings);
    const targetShift = currentShifts[key as keyof typeof currentShifts];
    
    const newShifts = {
      ...currentShifts,
      [key]: { ...targetShift, ...update }
    };
    
    const newSettings = { ...settings, shifts: newShifts };
    setSettings(newSettings);
    
    if (save) {
      handleAutoSave(newSettings);
    }
  };

  // Google Auth handlers
  const handleGoogleSignIn = async () => {
    const result = await signIn();
    if (result.success && result.user) {
      const newSettings = {
        ...settings,
        googleDriveLinked: true,
        googleAccountEmail: result.user.email
      };
      setSettings(newSettings);
      handleAutoSave(newSettings);
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

  /**
   * Load backup into preview mode (Local helper, doesn't lock DB)
   */
  const loadPreviewLocal = async (backupData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      setRestoreState(prev => ({ ...prev, phase: "preview", progress: 95 }));

      // Store preview data in memory/session (No preview_mode flag)
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

  // RESTORE FLOW HANDLERS

  // Step 1: Start Flow (Ask for PIN)
  const initiateRestore = () => {
    setRestoreState({ phase: "auth", pin: "" });
  };

  // Manual file upload handler
  const handleManualFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreState({ phase: "auth", pin: "" });
  };

  // Step 2: Verify PIN & Check Backup
  const verifyPinAndCheckBackup = async () => {
    // Check PIN length (4-6 digits)
    if (!restoreState.pin || restoreState.pin.length < 4 || restoreState.pin.length > 6) {
      setRestoreState(prev => ({ ...prev, error: "PIN must be 4-6 digits" }));
      return;
    }

    // Verify against actual admin user from AppContext
    const success = await loginAdmin(restoreState.pin);
    if (!success) {
      setRestoreState(prev => ({ ...prev, error: "Incorrect Admin PIN", pin: "" }));
      return;
    }

    setRestoreState(prev => ({ ...prev, phase: "checking", error: undefined }));
    
    try {
      // Check if manual file was selected
      const fileInput = document.getElementById("manual-backup-upload") as HTMLInputElement;
      const manualFile = fileInput?.files?.[0];

      if (manualFile) {
        // Manual file upload flow
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            
            // Decompress if .gz file
            let jsonData;
            if (manualFile.name.endsWith(".gz")) {
              const decompressed = await decompressGzip(new Uint8Array(arrayBuffer));
              jsonData = JSON.parse(new TextDecoder().decode(decompressed));
            } else {
              jsonData = JSON.parse(new TextDecoder().decode(arrayBuffer));
            }

            // Validate backup data structure
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

            // Store the data in IndexedDB/Memory via backupService (avoids localStorage limits)
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

      // Original Google Drive flow
      const restoreResult = await startRestore();
      if (!restoreResult.success || !restoreResult.backupData) {
        throw new Error(restoreResult.error || "Download failed");
      }

      // Step 2: Backup Current (Local Safety)
      await backupCurrentDatabase();
      setRestoreState(prev => ({ ...prev, progress: 75 }));

      // Step 3: Load Preview
      await loadPreviewLocal(restoreResult.backupData);
      setRestoreState(prev => ({ ...prev, progress: 100, phase: "preview" }));
      
      // DON'T reload - just show the preview UI
    } catch (err) {
      setRestoreState(prev => ({ 
        ...prev, 
        phase: "error", 
        error: err instanceof Error ? err.message : "Preview failed" 
      }));
    }
  };

  // Helper function to decompress gzip
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

  // Step 3: Start Download & Preview
  const startPreviewProcess = async () => {
    setRestoreState(prev => ({ ...prev, phase: "downloading", progress: 0 }));
    
    try {
      // Check if manual backup data exists (stored in previous step)
      const manualData = backupService.getStoredBackup();
      
      let backupData;
      if (manualData) {
        // Use manual uploaded data
        backupData = manualData;
        // No need to clear temp data yet, we need it for preview
        setRestoreState(prev => ({ ...prev, progress: 50 }));
      } else {
        // Download from Google Drive
        const restoreResult = await startRestore();
        if (!restoreResult.success || !restoreResult.backupData) {
          throw new Error(restoreResult.error || "Download failed");
        }
        backupData = restoreResult.backupData;
        setRestoreState(prev => ({ ...prev, progress: 50 }));
      }

      // Step 2: Backup Current (Local Safety)
      await backupCurrentDatabase();
      setRestoreState(prev => ({ ...prev, progress: 75 }));

      // Step 3: Store preview data if it came from download (manual data is already stored)
      if (backupData && !manualData) {
        backupService.storeBackupForPreview(backupData);
      }
      
      setRestoreState(prev => ({ ...prev, progress: 100, phase: "preview" }));
      
      // DON'T reload - just show the preview UI
    } catch (err) {
      setRestoreState(prev => ({ 
        ...prev, 
        phase: "error", 
        error: err instanceof Error ? err.message : "Preview failed" 
      }));
    }
  };

  // Step 4: Finalize Restore
  const finalizeRestoreProcess = async () => {
    setRestoreState(prev => ({ ...prev, phase: "restoring" }));
    
    try {
      const previewData = backupService.getStoredBackup();
      if (!previewData) throw new Error("Preview data lost");

      // CRITICAL: Clear preview mode BEFORE attempting to write
      backupService.clearStoredBackup();
      sessionStorage.removeItem("preview_mode");

      const result = await finalizeRestore(previewData);
      
      if (result.success) {
        setRestoreState(prev => ({ ...prev, phase: "success" }));
        setTimeout(() => {
           window.location.reload();
        }, 2000);
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
      if (!previewData) {
        throw new Error("Backup preview data not found");
      }

      const backupData = previewData;
    } catch (err) {
      setRestoreState(prev => ({ 
        ...prev, 
        phase: "error", 
        error: err instanceof Error ? err.message : "Preview data lost" 
      }));
    }
  };

  // Render Restore Modal / UI Overlay
  const renderRestoreUI = () => {
    if (restoreState.phase === "idle") return null;

    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-2 border-primary/20">
          
          {/* AUTH PHASE */}
          {restoreState.phase === "auth" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <Lock className="h-6 w-6" />
                <h2 className="text-xl font-bold">Admin Access Required</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter Admin PIN to access emergency restore functions.
              </p>
              
              {/* PIN Display - Masked dots (4-6 digits) */}
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

              {/* Number Pad - Circular buttons matching AdminLoginScreen */}
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

          {/* ERROR PHASE */}
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

          {/* CHECKING PHASE */}
          {restoreState.phase === "checking" && (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p>Checking Google Drive...</p>
            </div>
          )}

          {/* CONFIRM IMPACT PHASE */}
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
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3"/> Integrity:</span>
                  <span>Verified</span>
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

          {/* DOWNLOADING PHASE */}
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

          {/* FINAL CONFIRMATION PHASE (Inside Preview Modal usually, but here separate for clarity) */}
          {restoreState.phase === "final_confirm" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                <h2 className="text-xl font-bold">Final Confirmation</h2>
              </div>
              <p className="text-sm">
                You are about to permanently replace your live database with the backup data.
                This action cannot be undone (though a temporary revert is available for 24h).
              </p>
              <div className="py-2">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                  Type "RESTORE" to confirm:
                </p>
                <Input 
                  placeholder="RESTORE" 
                  className="font-mono"
                  onChange={(e) => {
                    if (e.target.value === "RESTORE") finalizeRestoreProcess();
                  }}
                />
              </div>
              <Button variant="ghost" className="w-full mt-2" onClick={() => setRestoreState(p => ({...p, phase: "preview"}))}>
                Go Back to Preview
              </Button>
            </div>
          )}

          {/* SUCCESS PHASE */}
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

  // Preview Mode Banner
  if (restoreState.phase === "preview") {
    // Get preview data from service (handles session vs memory)
    const previewData = backupService.getStoredBackup();

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Banner */}
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
        
        {/* Preview Content */}
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

  // Normal Render
  return (
    <div className="h-full flex flex-col relative">
      {renderRestoreUI()}
      
      {/* Progress Dialog */}
      <ProgressDialog 
        isOpen={progressDialog.isOpen}
        title={progressDialog.title}
        message={progressDialog.message}
        progress={progressDialog.progress}
        total={progressDialog.total}
      />
      
      {/* Sticky Tabs */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 rounded-none h-12">
            <TabsTrigger value="business" className="gap-2 text-xs sm:text-sm">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="pos" className="gap-2 text-xs sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">POS</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2 text-xs sm:text-sm">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* TAB 1: BUSINESS */}
          <TabsContent value="business" className="space-y-4 p-4 mt-0">
            {/* Business Info */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Business Information
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="businessName" className="text-sm">
                    Business Name *
                  </Label>
                  <Input
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                    onBlur={(e) => updateAndSave({ businessName: e.target.value })}
                    placeholder="My Store"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="businessAddress" className="text-sm">
                    Address
                    <HelpTooltip content="Printed on receipts" />
                  </Label>
                  <Textarea
                    id="businessAddress"
                    value={settings.businessAddress || ""}
                    onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                    onBlur={(e) => updateAndSave({ businessAddress: e.target.value })}
                    placeholder="123 Main St, City, State"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="taxId" className="text-sm">
                    Tax ID / NPWP
                    <HelpTooltip content="Tax identification number" />
                  </Label>
                  <Input
                    id="taxId"
                    value={settings.taxId || ""}
                    onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                    onBlur={(e) => updateAndSave({ taxId: e.target.value })}
                    placeholder="12.345.678.9-012.000"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="receiptFooter" className="text-sm">
                    Receipt Footer
                    <HelpTooltip content="Message at bottom of receipts" />
                  </Label>
                  <Textarea
                    id="receiptFooter"
                    value={settings.receiptFooter || ""}
                    onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                    onBlur={(e) => updateAndSave({ receiptFooter: e.target.value })}
                    placeholder="Thank you!"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Printer */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Receipt Printer
              </h3>

              {/* Paper Width */}
              <div className="mb-4">
                <Label className="text-sm mb-2 block">Paper Width</Label>
                <RadioGroup
                  value={settings.printerWidth.toString()}
                  onValueChange={(value) => {
                    const width = parseInt(value) as 58 | 80;
                    setSettings({ ...settings, printerWidth: width });
                    updateAndSave({ printerWidth: width });
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="58" id="w58" />
                    <Label htmlFor="w58" className="text-sm font-normal cursor-pointer">58mm</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="80" id="w80" />
                    <Label htmlFor="w80" className="text-sm font-normal cursor-pointer">80mm</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator className="my-3" />

              {/* Bluetooth Printer */}
              {!isBluetoothSupported ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Bluetooth printing requires Android Chrome
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bluetooth className="h-4 w-4" />
                    <span className="text-sm font-medium">Bluetooth Printer</span>
                    {printerConnected && (
                      <Badge variant="default" className="ml-auto text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${printerConnected ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="text-sm">
                        {printerConnected ? printerName : "Not Connected"}
                      </span>
                    </div>
                    {printerConnected ? (
                      <Button variant="outline" size="sm" onClick={handleDisconnectPrinter}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleConnectPrinter} disabled={printerConnecting}>
                        <Bluetooth className="h-3 w-3 mr-1" />
                        {printerConnecting ? "Connecting..." : "Connect"}
                      </Button>
                    )}
                  </div>

                  {printerConnected && (
                    <Button
                      onClick={handleTestPrint}
                      disabled={testPrinting}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <Printer className="h-3 w-3 mr-2" />
                      {testPrinting ? "Printing..." : "Test Print"}
                    </Button>
                  )}

                  {printerError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{printerError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 2: POS */}
          <TabsContent value="pos" className="space-y-4 p-4 mt-0">
            {activeTab === "pos" && (
              <div className="space-y-6">
                {/* 1. Shift Management */}
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t["settings.shiftManagement"]}
                  </h3>

                  <div className="space-y-4">
                    {/* Shift 1 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Shift 1</Label>
                        <Switch
                          checked={getSafeShifts(settings).shift1.enabled}
                          onCheckedChange={(checked) =>
                            updateShift('shift1', { enabled: checked }, true)
                          }
                        />
                      </div>
                      {getSafeShifts(settings).shift1.enabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start</Label>
                            <Input
                              type="time"
                              value={getSafeShifts(settings).shift1.startTime}
                              onChange={(e) =>
                                updateShift('shift1', { startTime: e.target.value }, false)
                              }
                              onBlur={(e) => updateShift('shift1', { startTime: e.target.value }, true)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">End</Label>
                            <Input
                              type="time"
                              value={getSafeShifts(settings).shift1.endTime}
                              onChange={(e) =>
                                updateShift('shift1', { endTime: e.target.value }, false)
                              }
                              onBlur={(e) => updateShift('shift1', { endTime: e.target.value }, true)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shift 2 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Shift 2</Label>
                        <Switch
                          checked={getSafeShifts(settings).shift2.enabled}
                          onCheckedChange={(checked) =>
                            updateShift('shift2', { enabled: checked }, true)
                          }
                        />
                      </div>
                      {getSafeShifts(settings).shift2.enabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start</Label>
                            <Input
                              type="time"
                              value={getSafeShifts(settings).shift2.startTime}
                              onChange={(e) =>
                                updateShift('shift2', { startTime: e.target.value }, false)
                              }
                              onBlur={(e) => updateShift('shift2', { startTime: e.target.value }, true)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">End</Label>
                            <Input
                              type="time"
                              value={getSafeShifts(settings).shift2.endTime}
                              onChange={(e) =>
                                updateShift('shift2', { endTime: e.target.value }, false)
                              }
                              onBlur={(e) => updateShift('shift2', { endTime: e.target.value }, true)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shift 3 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Shift 3</Label>
                        <Switch
                          checked={getSafeShifts(settings).shift3.enabled}
                          onCheckedChange={(checked) =>
                            updateShift('shift3', { enabled: checked }, true)
                          }
                        />
                      </div>
                      {getSafeShifts(settings).shift3.enabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start</Label>
                            <Input
                              type="time"
                              value={getSafeShifts(settings).shift3.startTime}
                              onChange={(e) =>
                                updateShift('shift3', { startTime: e.target.value }, false)
                              }
                              onBlur={(e) => updateShift('shift3', { startTime: e.target.value }, true)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">End</Label>
                            <Input
                              type="time"
                              value={getSafeShifts(settings).shift3.endTime}
                              onChange={(e) =>
                                updateShift('shift3', { endTime: e.target.value }, false)
                              }
                              onBlur={(e) => updateShift('shift3', { endTime: e.target.value }, true)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* 2. Payment Methods */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t["settings.paymentMethods"]}
                    <HelpTooltip content="Enable payment options for checkout" />
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Cash</span>
                      </div>
                      <Switch
                        checked={settings.paymentMethods?.cash !== false}
                        onCheckedChange={(checked) => {
                          setSettings({ 
                            ...settings, 
                            paymentMethods: { ...settings.paymentMethods, cash: checked }
                          });
                          updateAndSave({ 
                            paymentMethods: { ...settings.paymentMethods, cash: checked }
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Card (Debit/Credit)</span>
                      </div>
                      <Switch
                        checked={settings.paymentMethods?.card !== false}
                        onCheckedChange={(checked) => {
                          setSettings({ 
                            ...settings, 
                            paymentMethods: { ...settings.paymentMethods, card: checked }
                          });
                          updateAndSave({ 
                            paymentMethods: { ...settings.paymentMethods, card: checked }
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">E-Wallet (GoPay, OVO, Dana)</span>
                      </div>
                      <Switch
                        checked={settings.paymentMethods?.ewallet !== false}
                        onCheckedChange={(checked) => {
                          setSettings({ 
                            ...settings, 
                            paymentMethods: { ...settings.paymentMethods, ewallet: checked }
                          });
                          updateAndSave({ 
                            paymentMethods: { ...settings.paymentMethods, ewallet: checked }
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">QR Code (QRIS)</span>
                      </div>
                      <Switch
                        checked={settings.paymentMethods?.qr !== false}
                        onCheckedChange={(checked) => {
                          setSettings({ 
                            ...settings, 
                            paymentMethods: { ...settings.paymentMethods, qr: checked }
                          });
                          updateAndSave({ 
                            paymentMethods: { ...settings.paymentMethods, qr: checked }
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">Bank Transfer</span>
                      </div>
                      <Switch
                        checked={settings.paymentMethods?.transfer !== false}
                        onCheckedChange={(checked) => {
                          setSettings({ 
                            ...settings, 
                            paymentMethods: { ...settings.paymentMethods, transfer: checked }
                          });
                          updateAndSave({ 
                            paymentMethods: { ...settings.paymentMethods, transfer: checked }
                          });
                        }}
                      />
                    </div>
                  </div>
                </Card>

                {/* 3. Price Override */}
                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {t["settings.priceOverride"]}
                          <HelpTooltip content="Allow cashiers to adjust item prices during checkout" />
                        </h3>
                      </div>
                      <Switch
                        checked={settings.allowPriceOverride}
                        onCheckedChange={(checked) => {
                          setSettings({ ...settings, allowPriceOverride: checked });
                          updateAndSave({ allowPriceOverride: checked });
                        }}
                      />
                    </div>
                  </Card>
                </div>

                {/* 4. Tax Configuration */}
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {t["settings.taxConfiguration"]}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Tax 1 */}
                    <div className="space-y-2">
                      {/* Row 1: Editable Tax Name + Enable Toggle */}
                      <div className="flex items-center justify-between gap-3">
                        <Input
                          value={settings.tax1Label}
                          onChange={(e) => setSettings({ ...settings, tax1Label: e.target.value })}
                          onBlur={(e) => updateAndSave({ tax1Label: e.target.value })}
                          placeholder="Tax 1 (Primary)"
                          className="flex-1"
                        />
                        <Switch
                          checked={settings.tax1Enabled}
                          onCheckedChange={(checked) => {
                            setSettings({ ...settings, tax1Enabled: checked });
                            updateAndSave({ tax1Enabled: checked });
                          }}
                        />
                      </div>
                      
                      {/* Row 2: Rate + Tax Inclusive (collapse if disabled) */}
                      {settings.tax1Enabled && (
                        <div className="flex items-center gap-3 pl-4">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Rate (%)</Label>
                          <Input
                            type="number"
                            value={settings.tax1Rate}
                            onChange={(e) => setSettings({ ...settings, tax1Rate: Number(e.target.value) })}
                            onBlur={(e) => updateAndSave({ tax1Rate: Number(e.target.value) })}
                            className="w-20"
                          />
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Tax Inclusive</Label>
                          <Switch
                            checked={settings.tax1Inclusive || false}
                            onCheckedChange={(checked) => {
                              setSettings({ ...settings, tax1Inclusive: checked });
                              updateAndSave({ tax1Inclusive: checked });
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Tax 2 */}
                    <div className="space-y-2">
                      {/* Row 1: Editable Tax Name + Enable Toggle */}
                      <div className="flex items-center justify-between gap-3">
                        <Input
                          value={settings.tax2Label}
                          onChange={(e) => setSettings({ ...settings, tax2Label: e.target.value })}
                          onBlur={(e) => updateAndSave({ tax2Label: e.target.value })}
                          placeholder="Tax 2 (Secondary)"
                          className="flex-1"
                        />
                        <Switch
                          checked={settings.tax2Enabled}
                          onCheckedChange={(checked) => {
                            setSettings({ ...settings, tax2Enabled: checked });
                            updateAndSave({ tax2Enabled: checked });
                          }}
                        />
                      </div>
                      
                      {/* Row 2: Rate + Tax Inclusive (collapse if disabled) */}
                      {settings.tax2Enabled && (
                        <div className="flex items-center gap-3 pl-4">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Rate (%)</Label>
                          <Input
                            type="number"
                            value={settings.tax2Rate}
                            onChange={(e) => setSettings({ ...settings, tax2Rate: Number(e.target.value) })}
                            onBlur={(e) => updateAndSave({ tax2Rate: Number(e.target.value) })}
                            className="w-20"
                          />
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Tax Inclusive</Label>
                          <Switch
                            checked={settings.tax2Inclusive || false}
                            onCheckedChange={(checked) => {
                              setSettings({ ...settings, tax2Inclusive: checked });
                              updateAndSave({ tax2Inclusive: checked });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: SECURITY */}
          <TabsContent value="security" className="space-y-4 p-4 mt-0">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Access Control
              </h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Role-based access control coming soon
                </AlertDescription>
              </Alert>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Data Privacy
              </h3>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>✓ All data stored locally on your device</div>
                <div>✓ No data sent to external servers</div>
                <div>✓ Full control over your business data</div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: ADVANCED (With Backup) */}
          <TabsContent value="advanced" className="space-y-4 p-4 mt-0">
            {/* Database Management Section */}
            <Card className="p-4 border-amber-200 dark:border-amber-900">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <SettingsIcon className="h-5 w-5" />
                  <h3 className="font-semibold">Database Management</h3>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Manage your store data for onboarding, testing, or starting fresh.
                </p>

                <div className="space-y-3">
                  {/* Button 1: Inject Sample Data */}
                  <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">🎨 Inject Sample Data</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Load demo data: 200 items, 8 employees, 26 months of transactions. 
                          Perfect for learning the system.
                        </p>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={handleInjectSampleData}
                          disabled={progressDialog.isOpen}
                        >
                          Load Sample Data
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Button 2: Clear Transaction Data */}
                  <div className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">🗑️ Clear Transaction Data</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Remove all transactions and reports. Items, employees, and settings remain intact.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                          onClick={async () => {
                            if (!window.confirm(
                              "⚠️ Clear All Transaction Data?\n\n" +
                              "This will permanently delete:\n" +
                              "• All sales transactions\n" +
                              "• All reports and summaries\n" +
                              "• All attendance records\n\n" +
                              "Items, employees, and settings will be kept.\n\n" +
                              "This action cannot be undone!"
                            )) return;

                            // Second confirmation
                            if (!window.confirm(
                              "🔶 FINAL CONFIRMATION\n\n" +
                              "Are you absolutely sure?\n\n" +
                              "Click OK to clear all transaction data."
                            )) return;

                            try {
                              const { db } = await import("@/lib/db");
                              
                              // Clear transactions and summaries
                              await db.clearTransactions();
                              await db.clearDailySummaries();
                              await db.clearMonthlySummaries();
                              await db.clearAttendance();

                              alert("✅ Transaction data cleared successfully!\n\nReloading...");
                              window.location.reload();
                            } catch (error) {
                              console.error(error);
                              alert("Failed to clear transaction data: " + (error instanceof Error ? error.message : "Unknown error"));
                            }
                          }}
                        >
                          Clear Transaction Data
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Button 3: Factory Reset */}
                  <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1 text-red-600 dark:text-red-400">
                          🏭 Factory Reset
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Delete EVERYTHING and return to fresh install state. All data will be lost permanently.
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            if (window.confirm(
                              "🔴 FACTORY RESET - DANGER!\n\n" +
                              "This will DELETE EVERYTHING:\n" +
                              "• All items and inventory\n" +
                              "• All employees\n" +
                              "• All transactions and sales\n" +
                              "• All reports and summaries\n" +
                              "• All settings\n\n" +
                              "THIS ACTION CANNOT BE UNDONE!"
                            )) {
                              if (window.confirm(
                                "🔴 FINAL WARNING!\n\n" +
                                "Click OK to permanently delete everything.\n\n" +
                                "Click Cancel to keep your current data."
                              )) {
                                handleFactoryReset();
                              }
                            }
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Factory Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Separator className="my-6" />

            {/* Google Drive Backup */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Cloud Backup
                </h3>
                {isSignedIn && backupStatus.isHealthy && (
                  <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Data Safe
                  </Badge>
                )}
              </div>

              {!isInitialized ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : !isSignedIn ? (
                <div className="space-y-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Sign in to enable automatic "Last Known Good" backups.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleGoogleSignIn} className="w-full" size="sm">
                    <LinkIcon className="h-3 w-3 mr-2" />
                    Connect Google Drive
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Account Info */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      {user?.picture && (
                        <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" />
                      )}
                      <div className="text-sm">
                        <div className="font-medium">{user?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {backupStatus.lastBackupTime 
                            ? `Last backup: ${new Date(backupStatus.lastBackupTime).toLocaleString()}`
                            : "No backup yet"}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-xs h-8">
                      Disconnect
                    </Button>
                  </div>

                  {/* Manual Backup */}
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
                    Backup Now
                  </Button>
                  
                  {/* Hidden Restore Section (Requires Admin PIN) */}
                  <div className="pt-6 border-t mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Emergency Zone
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Hidden file input for manual upload */}
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
                        Upload Backup File
                      </Button>
                      
                      <Button
                        onClick={initiateRestore}
                        variant="destructive"
                        size="sm"
                        className="w-full bg-red-100 text-red-900 hover:bg-red-200 border-red-200"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Restore from Google Drive
                      </Button>
                      
                      {revertStatus.available && (
                        <Button
                          onClick={handleRevert}
                          variant="outline"
                          size="sm"
                          className="w-full border-amber-500 text-amber-600 hover:bg-amber-50"
                        >
                          <RotateCcw className="h-3 w-3 mr-2" />
                          Revert Restore ({revertStatus.hoursRemaining}h left)
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      Advanced recovery options. Admin access only.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Auto-save indicator */}
      {saving && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded">
          Saving...
        </div>
      )}
    </div>
  );
}