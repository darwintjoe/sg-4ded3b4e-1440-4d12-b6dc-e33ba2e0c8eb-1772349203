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
  Save,
  Shield,
  Lock
} from "lucide-react";

export function SettingsPanel() {
  const { settings: currentSettings, updateSettings, language } = useApp();
  const t = translations[language];

  // Local state for form
  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Bluetooth printer state
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [testPrinting, setTestPrinting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<string>("business");

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  // Check printer connection status on mount
  useEffect(() => {
    if (bluetoothPrinter.isSupported() && bluetoothPrinter.isConnected()) {
      setPrinterConnected(true);
      setPrinterName(bluetoothPrinter.getPrinterName());
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  // Bluetooth printer handlers
  const handleConnectPrinter = async () => {
    setPrinterConnecting(true);
    setPrinterError(null);

    try {
      const result = await bluetoothPrinter.connect();

      if (result.success && result.printerName && result.printerId) {
        setPrinterConnected(true);
        setPrinterName(result.printerName);
        
        // Save printer info to settings
        setSettings(prev => ({
          ...prev,
          bluetoothPrinterId: result.printerId,
          bluetoothPrinterName: result.printerName
        }));
      } else {
        setPrinterError(result.error || "Failed to connect to printer");
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
    
    // Clear printer info from settings
    setSettings(prev => ({
      ...prev,
      bluetoothPrinterId: undefined,
      bluetoothPrinterName: undefined
    }));
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure your business, POS system, security, and advanced features
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="lg"
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business" className="gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="pos" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">POS</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Business (Info + Printer) */}
        <TabsContent value="business" className="space-y-6">
          {/* Business Information */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Business Information</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your business details that appear on receipts and reports
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  placeholder="My Store"
                />
                <p className="text-xs text-muted-foreground">
                  Appears on receipts and reports
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  value={settings.businessAddress || ""}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                  placeholder="123 Main Street, City, State 12345"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Printed on receipts (optional)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / NPWP</Label>
                <Input
                  id="taxId"
                  value={settings.taxId || ""}
                  onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                  placeholder="12.345.678.9-012.000"
                />
                <p className="text-xs text-muted-foreground">
                  Tax identification number (optional)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Receipt Footer Message</Label>
                <Textarea
                  id="receiptFooter"
                  value={settings.receiptFooter || ""}
                  onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                  placeholder="Thank you for your purchase! Visit us again!"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Custom message at the bottom of receipts
                </p>
              </div>
            </div>
          </Card>

          {/* Receipt Printer Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Printer className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Receipt Printer</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Configure thermal printer for receipt printing
            </p>

            {/* Paper Width */}
            <div className="space-y-4 mb-6">
              <Label>Receipt Paper Width</Label>
              <RadioGroup
                value={settings.printerWidth.toString()}
                onValueChange={(value) => setSettings({ ...settings, printerWidth: parseInt(value) as 58 | 80 })}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="58" id="width-58" />
                  <Label htmlFor="width-58" className="cursor-pointer flex-1">
                    58mm (2.25 inches) - Compact
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="80" id="width-80" />
                  <Label htmlFor="width-80" className="cursor-pointer flex-1">
                    80mm (3.15 inches) - Standard
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator className="my-6" />

            {/* Bluetooth Printer */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bluetooth className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Bluetooth Thermal Printer</h4>
                {printerConnected && (
                  <Badge variant="default" className="ml-auto gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </div>

              {!isBluetoothSupported ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Bluetooth printing not supported on this device.</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      <div><strong>Requirements:</strong></div>
                      <div>• Android device with Chrome browser</div>
                      <div>• Bluetooth enabled on device</div>
                      <div className="mt-2">
                        <strong>iOS users:</strong> Use browser print or WiFi printer instead.
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${printerConnected ? "bg-green-500" : "bg-gray-300"}`} />
                      <div>
                        <p className="font-medium">
                          {printerConnected ? `Connected: ${printerName}` : "Not Connected"}
                        </p>
                        {printerConnected && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ready to print receipts
                          </p>
                        )}
                      </div>
                    </div>
                    {printerConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectPrinter}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        onClick={handleConnectPrinter}
                        disabled={printerConnecting}
                        size="sm"
                      >
                        <Bluetooth className="h-4 w-4 mr-2" />
                        {printerConnecting ? "Connecting..." : "Connect Printer"}
                      </Button>
                    )}
                  </div>

                  {/* Test Print Button */}
                  {printerConnected && (
                    <Button
                      onClick={handleTestPrint}
                      disabled={testPrinting}
                      variant="secondary"
                      className="w-full"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      {testPrinting ? "Printing..." : "Test Print"}
                    </Button>
                  )}

                  {/* Error Message */}
                  {printerError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{printerError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Requirements & Tips */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Setup Requirements:</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>✓ ESC/POS compatible thermal printer</div>
                        <div>✓ Printer powered on and Bluetooth enabled</div>
                        <div>✓ Printer within Bluetooth range (&lt;10 meters)</div>
                        <div>✓ Paper loaded correctly in printer</div>
                      </div>
                      <div className="mt-3">
                        <strong>Troubleshooting:</strong>
                      </div>
                      <div className="mt-1 space-y-1 text-sm">
                        <div>• Connection required on each app launch (browser security)</div>
                        <div>• If connection fails, restart printer and try again</div>
                        <div>• Ensure printer is not connected to other devices</div>
                        <div>• Check printer battery/power level</div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Supported Printers */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2 text-sm">Supported Printer Models:</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• Epson TM series (TM-m30, TM-T82, TM-T20)</div>
                      <div>• Star Micronics TSP series</div>
                      <div>• Rongta RPP series</div>
                      <div>• Zjiang ZJ series</div>
                      <div>• Most ESC/POS compatible thermal printers</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: POS Settings */}
        <TabsContent value="pos" className="space-y-6">
          {/* POS Mode */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">POS Mode</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the operating mode for your point of sale system
            </p>
            <RadioGroup
              value={settings.mode}
              onValueChange={(value: POSMode) => setSettings({ ...settings, mode: value })}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="retail" id="retail" />
                <div className="flex-1">
                  <Label htmlFor="retail" className="cursor-pointer font-medium">
                    Retail Mode
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    For shops, stores, and retail businesses. Items are sold by unit/quantity.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="cafe" id="cafe" />
                <div className="flex-1">
                  <Label htmlFor="cafe" className="cursor-pointer font-medium">
                    Cafe/Restaurant Mode
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    For cafes, restaurants, and food service. Optimized for food orders.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </Card>

          {/* Language */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Language</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select the display language for the POS interface
            </p>
            <RadioGroup
              value={settings.language}
              onValueChange={(value: "en" | "id") => setSettings({ ...settings, language: value })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="en" id="lang-en" />
                <Label htmlFor="lang-en" className="cursor-pointer flex-1">
                  English
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="id" id="lang-id" />
                <Label htmlFor="lang-id" className="cursor-pointer flex-1">
                  Bahasa Indonesia
                </Label>
              </div>
            </RadioGroup>
          </Card>

          {/* Tax 1 (PPN) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Tax 1 (Primary)</h3>
              </div>
              <Switch
                checked={settings.tax1Enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, tax1Enabled: checked })}
              />
            </div>

            {settings.tax1Enabled && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax1Label">Tax Label</Label>
                    <Input
                      id="tax1Label"
                      value={settings.tax1Label}
                      onChange={(e) => setSettings({ ...settings, tax1Label: e.target.value })}
                      placeholder="PPN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax1Rate">Tax Rate (%)</Label>
                    <Input
                      id="tax1Rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settings.tax1Rate}
                      onChange={(e) => setSettings({ ...settings, tax1Rate: parseFloat(e.target.value) || 0 })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Switch
                    id="tax1Inclusive"
                    checked={settings.tax1Inclusive}
                    onCheckedChange={(checked) => setSettings({ ...settings, tax1Inclusive: checked })}
                  />
                  <div className="flex-1">
                    <Label htmlFor="tax1Inclusive" className="cursor-pointer font-medium">
                      Tax Inclusive Pricing
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Item prices already include this tax. Tax will be calculated backward from the total price.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Tax 2 (GST) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Tax 2 (Secondary)</h3>
              </div>
              <Switch
                checked={settings.tax2Enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, tax2Enabled: checked })}
              />
            </div>

            {settings.tax2Enabled && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax2Label">Tax Label</Label>
                    <Input
                      id="tax2Label"
                      value={settings.tax2Label}
                      onChange={(e) => setSettings({ ...settings, tax2Label: e.target.value })}
                      placeholder="GST"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax2Rate">Tax Rate (%)</Label>
                    <Input
                      id="tax2Rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settings.tax2Rate}
                      onChange={(e) => setSettings({ ...settings, tax2Rate: parseFloat(e.target.value) || 0 })}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Switch
                    id="tax2Inclusive"
                    checked={settings.tax2Inclusive}
                    onCheckedChange={(checked) => setSettings({ ...settings, tax2Inclusive: checked })}
                  />
                  <div className="flex-1">
                    <Label htmlFor="tax2Inclusive" className="cursor-pointer font-medium">
                      Tax Inclusive Pricing
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Item prices already include this tax. Tax will be calculated backward from the total price.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Price Override */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Price Override</h3>
              </div>
              <Switch
                checked={settings.allowPriceOverride}
                onCheckedChange={(checked) => setSettings({ ...settings, allowPriceOverride: checked })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Allow cashiers to manually adjust item prices during checkout (useful for discounts or custom pricing)
            </p>
          </Card>

          {/* Tax Calculation Example */}
          {(settings.tax1Enabled || settings.tax2Enabled) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tax Calculation Example:</strong>
                <div className="mt-2 space-y-1 text-sm">
                  {settings.tax1Enabled && (
                    <div>
                      • {settings.tax1Label}: {settings.tax1Rate}% {settings.tax1Inclusive ? "(Inclusive)" : "(Exclusive)"}
                    </div>
                  )}
                  {settings.tax2Enabled && (
                    <div>
                      • {settings.tax2Label}: {settings.tax2Rate}% {settings.tax2Inclusive ? "(Inclusive)" : "(Exclusive)"}
                    </div>
                  )}
                  <div className="mt-2">
                    For a 100.000 item price:
                    <br />
                    {settings.tax1Inclusive ? (
                      <>Subtotal: {(100000 / (1 + settings.tax1Rate / 100)).toFixed(0)} + {settings.tax1Label}: {(100000 - 100000 / (1 + settings.tax1Rate / 100)).toFixed(0)} = 100.000</>
                    ) : (
                      <>Subtotal: 100.000 + {settings.tax1Label}: {(100000 * settings.tax1Rate / 100).toFixed(0)} = {(100000 * (1 + settings.tax1Rate / 100)).toFixed(0)}</>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Tab 3: Security & Access */}
        <TabsContent value="security" className="space-y-6">
          {/* Access Control */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Access Control</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Manage user permissions and access levels
            </p>
            
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <strong>Coming Soon</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <div>• Role-based access control (Admin, Manager, Cashier)</div>
                  <div>• Custom permission settings per employee</div>
                  <div>• PIN code protection for sensitive operations</div>
                  <div>• Activity logging and audit trail</div>
                </div>
              </AlertDescription>
            </Alert>
          </Card>

          {/* Password & PIN */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Password & PIN Management</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Change admin password and configure PIN requirements
            </p>
            
            <div className="space-y-4">
              <Button variant="outline" className="w-full" disabled>
                Change Admin Password (Coming Soon)
              </Button>
              
              <Button variant="outline" className="w-full" disabled>
                Configure PIN Requirements (Coming Soon)
              </Button>
            </div>
          </Card>

          {/* Data Privacy */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Data Privacy</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Control data collection and retention policies
            </p>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div><strong>Current Status:</strong></div>
                  <div>• All data stored locally on your device</div>
                  <div>• No data sent to external servers</div>
                  <div>• Full control over your business data</div>
                  <div>• No third-party tracking or analytics</div>
                </div>
              </AlertDescription>
            </Alert>
          </Card>
        </TabsContent>

        {/* Tab 4: Advanced */}
        <TabsContent value="advanced" className="space-y-6">
          {/* Google Drive Backup */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Google Drive Backup</h3>
              </div>
              {settings.googleDriveLinked && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Automatically backup your data to Google Drive
            </p>

            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Google Drive integration coming in future update</span>
                  </div>
                </AlertDescription>
              </Alert>

              <Button variant="outline" disabled className="w-full">
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect Google Drive (Coming Soon)
              </Button>
            </div>
          </Card>

          {/* Export & Import Data */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Data Management</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Export your data for backup or import data from other sources
            </p>

            <div className="space-y-3">
              <Button variant="outline" className="w-full" disabled>
                Export All Data (JSON) - Coming Soon
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Import Data from File - Coming Soon
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Reset All Data - Coming Soon
              </Button>
            </div>
          </Card>

          {/* Future Integrations */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Future Integrations</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Additional integrations will be available in future updates
            </p>

            <div className="grid gap-3">
              <div className="p-4 border rounded-lg flex items-center justify-between opacity-50">
                <div>
                  <p className="font-medium text-sm">WhatsApp Notifications</p>
                  <p className="text-xs text-muted-foreground">Send receipts via WhatsApp</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="p-4 border rounded-lg flex items-center justify-between opacity-50">
                <div>
                  <p className="font-medium text-sm">Email Receipts</p>
                  <p className="text-xs text-muted-foreground">Send receipts to customer email</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="p-4 border rounded-lg flex items-center justify-between opacity-50">
                <div>
                  <p className="font-medium text-sm">Cloud Sync</p>
                  <p className="text-xs text-muted-foreground">Sync data across multiple devices</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="p-4 border rounded-lg flex items-center justify-between opacity-50">
                <div>
                  <p className="font-medium text-sm">Accounting Software Integration</p>
                  <p className="text-xs text-muted-foreground">Connect to QuickBooks, Xero, etc.</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </Card>

          {/* System Information */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">System Information</h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Database</span>
                <span className="font-medium">IndexedDB (Local)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">Progressive Web App (PWA)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Browser</span>
                <span className="font-medium">{navigator.userAgent.includes("Chrome") ? "Chrome" : "Other"}</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button (Fixed Bottom) */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="lg"
          className="w-full gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}