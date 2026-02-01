import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { Settings, Language } from "@/types";
import { Upload, X, Printer, Bluetooth, Check, AlertCircle, Loader2 } from "lucide-react";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bluetooth printer state
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerTesting, setPrinterTesting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<"disconnected" | "connected" | "error">("disconnected");
  const [printerError, setPrinterError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    checkPrinterConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await db.getSettings();
      setSettings(loadedSettings);
      if (loadedSettings.businessLogo) {
        setLogoPreview(loadedSettings.businessLogo);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkPrinterConnection = () => {
    if (bluetoothPrinter.isConnected()) {
      setPrinterStatus("connected");
    } else {
      setPrinterStatus("disconnected");
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await db.put("settings", settings);
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload a PNG, JPG, or GIF image");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setLogoPreview(base64);
      if (settings) {
        setSettings({ ...settings, businessLogo: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (settings) {
      setSettings({ ...settings, businessLogo: undefined });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConnectPrinter = async () => {
    setPrinterConnecting(true);
    setPrinterError(null);

    try {
      const result = await bluetoothPrinter.connect();
      
      if (result.success && result.printerName && result.printerId) {
        setPrinterStatus("connected");
        if (settings) {
          setSettings({
            ...settings,
            bluetoothPrinterName: result.printerName,
            bluetoothPrinterId: result.printerId,
          });
        }
      } else {
        setPrinterStatus("error");
        setPrinterError(result.error || "Failed to connect to printer");
      }
    } catch (error) {
      setPrinterStatus("error");
      setPrinterError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setPrinterConnecting(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await bluetoothPrinter.disconnect();
    setPrinterStatus("disconnected");
    if (settings) {
      setSettings({
        ...settings,
        bluetoothPrinterName: undefined,
        bluetoothPrinterId: undefined,
      });
    }
  };

  const handleTestPrint = async () => {
    if (!settings) return;

    setPrinterTesting(true);
    setPrinterError(null);

    try {
      const result = await bluetoothPrinter.printTest(settings);
      
      if (result.success) {
        alert("Test print sent successfully!");
      } else {
        setPrinterError(result.error || "Failed to print test");
      }
    } catch (error) {
      setPrinterError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setPrinterTesting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  const isBluetoothSupported = bluetoothPrinter.isSupported();

  return (
    <div className="space-y-6 p-6">
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>📄 Business Information</CardTitle>
          <CardDescription>Receipt header information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business Logo */}
          <div className="space-y-2">
            <Label>Business Logo (Optional)</Label>
            <div className="space-y-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={handleLogoUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                ℹ️ Logo will be converted to black & white for thermal printing
              </p>
              {logoPreview && (
                <div className="relative inline-block">
                  <img src={logoPreview} alt="Logo preview" className="h-24 w-auto border rounded" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={settings.businessName}
              onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
              placeholder="My Store"
              required
            />
          </div>

          {/* Business Address */}
          <div className="space-y-2">
            <Label htmlFor="businessAddress">Business Address (Optional)</Label>
            <Textarea
              id="businessAddress"
              value={settings.businessAddress || ""}
              onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
              placeholder="123 Main Street&#10;City, State 12345&#10;Country"
              rows={3}
            />
          </div>

          {/* Tax ID */}
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID / NPWP (Optional)</Label>
            <Input
              id="taxId"
              value={settings.taxId || ""}
              onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
              placeholder="NPWP: 12.345.678.9-012.000"
            />
          </div>

          {/* Receipt Footer */}
          <div className="space-y-2">
            <Label htmlFor="receiptFooter">Receipt Footer (Optional)</Label>
            <Textarea
              id="receiptFooter"
              value={settings.receiptFooter || ""}
              onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
              placeholder="Thank you for your purchase!&#10;Visit us again!&#10;www.mystore.com"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Printer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>🖨️ Printer Settings</CardTitle>
          <CardDescription>Thermal receipt printer configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Receipt Width */}
          <div className="space-y-2">
            <Label>Receipt Width</Label>
            <RadioGroup
              value={settings.printerWidth?.toString() || "80"}
              onValueChange={(value) => setSettings({ ...settings, printerWidth: parseInt(value) })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="58" id="width-58" />
                <Label htmlFor="width-58" className="font-normal cursor-pointer">
                  58mm (Compact)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="80" id="width-80" />
                <Label htmlFor="width-80" className="font-normal cursor-pointer">
                  80mm (Standard)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Bluetooth Printer Connection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base">Bluetooth Thermal Printer</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Connect to ESC/POS compatible thermal printer
              </p>
            </div>

            {!isBluetoothSupported && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Bluetooth printing not supported on this device.</strong>
                  <br />
                  Requirements: Android device with Chrome browser.
                  <br />
                  iOS users: Use browser print instead.
                </AlertDescription>
              </Alert>
            )}

            {isBluetoothSupported && (
              <>
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    {printerStatus === "disconnected" && (
                      <>
                        <div className="h-3 w-3 rounded-full bg-gray-400" />
                        <span className="text-sm">Not Connected</span>
                      </>
                    )}
                    {printerStatus === "connected" && (
                      <>
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">
                          Connected: {settings.bluetoothPrinterName || "Unknown Printer"}
                        </span>
                        <Check className="h-4 w-4 text-green-500" />
                      </>
                    )}
                    {printerStatus === "error" && (
                      <>
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-sm text-red-500">Connection Error</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Connection Buttons */}
                <div className="flex gap-2">
                  {printerStatus === "disconnected" && (
                    <Button
                      onClick={handleConnectPrinter}
                      disabled={printerConnecting}
                      className="flex items-center gap-2"
                    >
                      {printerConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bluetooth className="h-4 w-4" />
                      )}
                      {printerConnecting ? "Connecting..." : "Connect Printer"}
                    </Button>
                  )}

                  {printerStatus === "connected" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleDisconnectPrinter}
                        className="flex items-center gap-2"
                      >
                        <Bluetooth className="h-4 w-4" />
                        Disconnect
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleTestPrint}
                        disabled={printerTesting}
                        className="flex items-center gap-2"
                      >
                        {printerTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
                        {printerTesting ? "Printing..." : "Test Print"}
                      </Button>
                    </>
                  )}

                  {printerStatus === "error" && (
                    <Button
                      onClick={handleConnectPrinter}
                      disabled={printerConnecting}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {printerConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bluetooth className="h-4 w-4" />
                      )}
                      Retry Connection
                    </Button>
                  )}
                </div>

                {/* Error Message */}
                {printerError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{printerError}</AlertDescription>
                  </Alert>
                )}

                {/* Requirements & Troubleshooting */}
                <Alert>
                  <AlertDescription className="space-y-2">
                    <div>
                      <strong>ℹ️ Requirements:</strong>
                      <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                        <li>Android device with Chrome browser</li>
                        <li>Bluetooth enabled on device</li>
                        <li>Printer powered on and in range</li>
                        <li>ESC/POS compatible thermal printer</li>
                      </ul>
                    </div>
                    <div>
                      <strong>🔧 Troubleshooting:</strong>
                      <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                        <li>Turn printer off and on again</li>
                        <li>Ensure printer is in pairing mode</li>
                        <li>Check Bluetooth is enabled</li>
                        <li>Move device closer to printer</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* POS Mode */}
      <Card>
        <CardHeader>
          <CardTitle>🏪 POS Mode</CardTitle>
          <CardDescription>Select your business type</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.mode}
            onValueChange={(value) => setSettings({ ...settings, mode: value as "retail" | "cafe" })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="retail" id="mode-retail" />
              <Label htmlFor="mode-retail" className="font-normal cursor-pointer">
                Retail (Quick checkout)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cafe" id="mode-cafe" />
              <Label htmlFor="mode-cafe" className="font-normal cursor-pointer">
                Café (Order management)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Tax Settings</CardTitle>
          <CardDescription>Configure tax rates for your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tax 1 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tax1-enabled" className="text-base">
                  Enable Tax 1
                </Label>
                <p className="text-sm text-muted-foreground">Primary tax (e.g., VAT, GST)</p>
              </div>
              <Switch
                id="tax1-enabled"
                checked={settings.tax1Enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, tax1Enabled: checked })}
              />
            </div>

            {settings.tax1Enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tax1-label">Tax 1 Label</Label>
                  <Input
                    id="tax1-label"
                    value={settings.tax1Label}
                    onChange={(e) => setSettings({ ...settings, tax1Label: e.target.value })}
                    placeholder="VAT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax1-rate">Tax 1 Rate (%)</Label>
                  <Input
                    id="tax1-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.tax1Rate}
                    onChange={(e) =>
                      setSettings({ ...settings, tax1Rate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="tax1-inclusive"
                    checked={settings.tax1Inclusive}
                    onCheckedChange={(checked) => setSettings({ ...settings, tax1Inclusive: checked })}
                  />
                  <Label htmlFor="tax1-inclusive" className="font-normal cursor-pointer">
                    Tax included in prices (inclusive)
                  </Label>
                </div>
              </>
            )}
          </div>

          {/* Tax 2 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tax2-enabled" className="text-base">
                  Enable Tax 2
                </Label>
                <p className="text-sm text-muted-foreground">Secondary tax (e.g., Service charge)</p>
              </div>
              <Switch
                id="tax2-enabled"
                checked={settings.tax2Enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, tax2Enabled: checked })}
              />
            </div>

            {settings.tax2Enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tax2-label">Tax 2 Label</Label>
                  <Input
                    id="tax2-label"
                    value={settings.tax2Label}
                    onChange={(e) => setSettings({ ...settings, tax2Label: e.target.value })}
                    placeholder="Service Charge"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax2-rate">Tax 2 Rate (%)</Label>
                  <Input
                    id="tax2-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.tax2Rate}
                    onChange={(e) =>
                      setSettings({ ...settings, tax2Rate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>🌐 Language</CardTitle>
          <CardDescription>Interface language</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.language}
            onValueChange={(value) => setSettings({ ...settings, language: value as Language })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="id">Bahasa Indonesia</SelectItem>
              <SelectItem value="zh">中文 (Chinese)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Additional Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-price-override">Allow Price Override</Label>
              <p className="text-sm text-muted-foreground">Cashiers can modify item prices</p>
            </div>
            <Switch
              id="allow-price-override"
              checked={settings.allowPriceOverride || false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowPriceOverride: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving..." : "💾 Save Settings"}
        </Button>
      </div>
    </div>
  );
}