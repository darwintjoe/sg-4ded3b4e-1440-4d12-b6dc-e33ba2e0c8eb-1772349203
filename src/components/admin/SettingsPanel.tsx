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
  Wallet
} from "lucide-react";

export function SettingsPanel() {
  const { settings: currentSettings, updateSettings, language } = useApp();
  const t = translations[language];

  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [saving, setSaving] = useState(false);

  // Bluetooth printer state
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [testPrinting, setTestPrinting] = useState(false);

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
            {/* Tax 1 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Tax 1 (Primary)
                  <HelpTooltip content="Primary tax like VAT or PPN" />
                </h3>
                <Switch
                  checked={settings.tax1Enabled}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, tax1Enabled: checked });
                    updateAndSave({ tax1Enabled: checked });
                  }}
                />
              </div>

              {settings.tax1Enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="tax1Label" className="text-sm">Label</Label>
                      <Input
                        id="tax1Label"
                        value={settings.tax1Label}
                        onChange={(e) => setSettings({ ...settings, tax1Label: e.target.value })}
                        onBlur={(e) => updateAndSave({ tax1Label: e.target.value })}
                        placeholder="PPN"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tax1Rate" className="text-sm">Rate (%)</Label>
                      <Input
                        id="tax1Rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.tax1Rate}
                        onChange={(e) => setSettings({ ...settings, tax1Rate: parseFloat(e.target.value) || 0 })}
                        onBlur={(e) => updateAndSave({ tax1Rate: parseFloat(e.target.value) || 0 })}
                        placeholder="10"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tax1Inc"
                      checked={settings.tax1Inclusive}
                      onCheckedChange={(checked) => {
                        setSettings({ ...settings, tax1Inclusive: checked });
                        updateAndSave({ tax1Inclusive: checked });
                      }}
                    />
                    <Label htmlFor="tax1Inc" className="text-sm font-normal cursor-pointer">
                      Tax Inclusive
                      <HelpTooltip content="Item prices already include this tax" />
                    </Label>
                  </div>
                </div>
              )}
            </Card>

            {/* Tax 2 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Tax 2 (Secondary)
                  <HelpTooltip content="Secondary tax like GST or service charge" />
                </h3>
                <Switch
                  checked={settings.tax2Enabled}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, tax2Enabled: checked });
                    updateAndSave({ tax2Enabled: checked });
                  }}
                />
              </div>

              {settings.tax2Enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="tax2Label" className="text-sm">Label</Label>
                      <Input
                        id="tax2Label"
                        value={settings.tax2Label}
                        onChange={(e) => setSettings({ ...settings, tax2Label: e.target.value })}
                        onBlur={(e) => updateAndSave({ tax2Label: e.target.value })}
                        placeholder="GST"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tax2Rate" className="text-sm">Rate (%)</Label>
                      <Input
                        id="tax2Rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.tax2Rate}
                        onChange={(e) => setSettings({ ...settings, tax2Rate: parseFloat(e.target.value) || 0 })}
                        onBlur={(e) => updateAndSave({ tax2Rate: parseFloat(e.target.value) || 0 })}
                        placeholder="5"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tax2Inc"
                      checked={settings.tax2Inclusive}
                      onCheckedChange={(checked) => {
                        setSettings({ ...settings, tax2Inclusive: checked });
                        updateAndSave({ tax2Inclusive: checked });
                      }}
                    />
                    <Label htmlFor="tax2Inc" className="text-sm font-normal cursor-pointer">
                      Tax Inclusive
                      <HelpTooltip content="Item prices already include this tax" />
                    </Label>
                  </div>
                </div>
              )}
            </Card>

            {/* Price Override */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Override
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

            <Separator className="my-4" />

            {/* Shift Management */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Shift Management
                <HelpTooltip content="Configure shift timing and rules" />
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="shiftStart" className="text-sm">Shift Start</Label>
                    <Input
                      id="shiftStart"
                      type="time"
                      value={settings.shiftStartTime || "09:00"}
                      onChange={(e) => setSettings({ ...settings, shiftStartTime: e.target.value })}
                      onBlur={(e) => updateAndSave({ shiftStartTime: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shiftEnd" className="text-sm">Shift End</Label>
                    <Input
                      id="shiftEnd"
                      type="time"
                      value={settings.shiftEndTime || "18:00"}
                      onChange={(e) => setSettings({ ...settings, shiftEndTime: e.target.value })}
                      onBlur={(e) => updateAndSave({ shiftEndTime: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requireClockIn"
                    checked={settings.requireClockIn || false}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, requireClockIn: checked });
                      updateAndSave({ requireClockIn: checked });
                    }}
                  />
                  <Label htmlFor="requireClockIn" className="text-sm font-normal cursor-pointer">
                    Require Clock In/Out
                    <HelpTooltip content="Force employees to clock in before accessing POS" />
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="trackBreaks"
                    checked={settings.trackBreaks || false}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, trackBreaks: checked });
                      updateAndSave({ trackBreaks: checked });
                    }}
                  />
                  <Label htmlFor="trackBreaks" className="text-sm font-normal cursor-pointer">
                    Track Breaks
                    <HelpTooltip content="Record break time separately from work hours" />
                  </Label>
                </div>
              </div>
            </Card>

            {/* Payment Methods */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Methods
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
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Google Drive Backup
                </h3>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full">
                Connect Google Drive
              </Button>
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