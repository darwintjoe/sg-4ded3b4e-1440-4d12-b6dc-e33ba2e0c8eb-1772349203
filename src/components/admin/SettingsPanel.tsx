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
import { Settings, POSMode } from "@/types";
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
  RefreshCw
} from "lucide-react";

export function SettingsPanel() {
  const { settings: currentSettings, updateSettings, language } = useApp();
  const { user, isSignedIn, isInitialized, signIn, signOut, uploadBackup, listBackups, downloadBackup } = useGoogleAuth();
  const t = translations[language];

  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [saving, setSaving] = useState(false);

  // Bluetooth printer state
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [testPrinting, setTestPrinting] = useState(false);

  // Google backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("business");

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

  // Google Auth handlers
  const handleGoogleSignIn = async () => {
    setBackupError(null);
    const result = await signIn();
    
    if (result.success && result.user) {
      // Save the linked email to settings for Alternate Admin Login
      const newSettings = {
        ...settings,
        googleDriveLinked: true,
        googleAccountEmail: result.user.email
      };
      setSettings(newSettings);
      handleAutoSave(newSettings);
    } else if (!result.success) {
      setBackupError(result.error || "Failed to sign in");
    }
  };

  const handleGoogleSignOut = () => {
    signOut();
    setLastBackupTime(null);
    
    // Optional: Remove link from settings (or keep it to allow re-login)
    // For security, we might want to keep the email in settings so only THIS email can unlock admin
  };

  const handleBackupNow = async () => {
    setBackupLoading(true);
    setBackupError(null);
    setBackupSuccess(false);

    try {
      // Get all data from IndexedDB
      const { getAllData } = await import("@/lib/db");
      const allData = await getAllData();

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `sellmore-backup-${timestamp}.json.gz`;

      // Upload to Drive
      const result = await uploadBackup(allData, filename);

      if (result.success) {
        setBackupSuccess(true);
        setLastBackupTime(new Date().toISOString());
        setTimeout(() => setBackupSuccess(false), 3000);
      } else {
        setBackupError(result.error || "Backup failed");
      }
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    setBackupLoading(true);
    setBackupError(null);

    try {
      // List available backups
      const result = await listBackups();

      if (!result.success || !result.backups || result.backups.length === 0) {
        setBackupError("No backups found");
        setBackupLoading(false);
        return;
      }

      // Get the latest backup
      const latestBackup = result.backups[0];

      // Download and restore
      const downloadResult = await downloadBackup(latestBackup.id);

      if (downloadResult.success && downloadResult.data) {
        // Import data to IndexedDB
        const { importData } = await import("@/lib/db");
        await importData(downloadResult.data);

        // Reload the page to reflect changes
        window.location.reload();
      } else {
        setBackupError(downloadResult.error || "Restore failed");
      }
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBackupLoading(false);
    }
  };

  const isBluetoothSupported = bluetoothPrinter.isSupported();

  const HelpTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const enabledShiftCount = settings.shifts 
    ? Object.values(settings.shifts).filter(s => s.enabled).length 
    : 1;

  // Helper to ensure valid shifts object structure
  const getSafeShifts = (currentSettings: Settings) => {
    const defaultShifts = {
      shift1: { name: "Morning Shift", startTime: "09:00", endTime: "18:00", enabled: true },
      shift2: { name: "Afternoon Shift", startTime: "14:00", endTime: "22:00", enabled: false },
      shift3: { name: "Night Shift", startTime: "22:00", endTime: "06:00", enabled: false }
    };

    return {
      shift1: { ...defaultShifts.shift1, ...(currentSettings.shifts?.shift1 || {}) },
      shift2: { ...defaultShifts.shift2, ...(currentSettings.shifts?.shift2 || {}) },
      shift3: { ...defaultShifts.shift3, ...(currentSettings.shifts?.shift3 || {}) }
    };
  };

  const updateShift = (shiftKey: 'shift1' | 'shift2' | 'shift3', updates: Partial<typeof settings.shifts.shift1>, save: boolean = false) => {
    const safeShifts = getSafeShifts(settings);
    const newShifts = {
      ...safeShifts,
      [shiftKey]: { ...safeShifts[shiftKey], ...updates }
    };
    
    const newSettings = { ...settings, shifts: newShifts };
    setSettings(newSettings);
    
    if (save) {
      handleAutoSave(newSettings);
    }
  };

  return (
    <div className="h-full flex flex-col">
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

          {/* TAB 4: ADVANCED */}
          <TabsContent value="advanced" className="space-y-4 p-4 mt-0">
            {/* Google Drive Backup */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Google Drive Backup
                </h3>
                {isSignedIn && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Linked
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
                      Link your Google account to backup data to Drive (15GB free). Protects against device damage/loss.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={handleGoogleSignIn} 
                    className="w-full"
                    size="sm"
                  >
                    <LinkIcon className="h-3 w-3 mr-2" />
                    Link Google Account
                  </Button>
                  {backupError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{backupError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Account Info */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      {user?.picture && (
                        <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" />
                      )}
                      <div className="text-sm">
                        <div className="font-medium">{user?.name}</div>
                        <div className="text-xs text-muted-foreground">{user?.email}</div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleGoogleSignOut}
                      className="text-xs"
                    >
                      Unlink
                    </Button>
                  </div>

                  {/* Last Backup Time */}
                  {lastBackupTime && (
                    <div className="text-xs text-muted-foreground">
                      Last backup: {new Date(lastBackupTime).toLocaleString()}
                    </div>
                  )}

                  {/* Backup Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleBackupNow}
                      disabled={backupLoading}
                      size="sm"
                      className="w-full"
                    >
                      {backupLoading ? (
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3 mr-2" />
                      )}
                      Backup Now
                    </Button>
                    <Button
                      onClick={handleRestoreBackup}
                      disabled={backupLoading}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {backupLoading ? (
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3 mr-2" />
                      )}
                      Restore
                    </Button>
                  </div>

                  {/* Success/Error Messages */}
                  {backupSuccess && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Backup uploaded successfully!
                      </AlertDescription>
                    </Alert>
                  )}

                  {backupError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{backupError}</AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      ✓ Free 15GB storage • ✓ Encrypted backups • ✓ Access from any device
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Data Management
              </h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" disabled className="w-full text-xs">
                  Export All Data (JSON)
                </Button>
                <Button variant="outline" size="sm" disabled className="w-full text-xs">
                  Import Data from File
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                System Info
              </h3>
              <div className="text-xs space-y-1">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Version</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Database</span>
                  <span>IndexedDB</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Platform</span>
                  <span>PWA</span>
                </div>
              </div>
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