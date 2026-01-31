import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Settings as SettingsType, POSMode } from "@/types";
import { Save, Check } from "lucide-react";

export function SettingsPanel() {
  const { language, mode, setMode } = useApp();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const allSettings = await db.getAll<SettingsType>("settings");
    if (allSettings.length > 0) {
      setSettings(allSettings[0]);
    } else {
      const defaultSettings: SettingsType = {
        key: "default",
        mode: "retail",
        tax1Enabled: true,
        tax1Label: "PPN",
        tax1Rate: 10,
        tax1Inclusive: false,
        tax2Enabled: false,
        tax2Label: "GST",
        tax2Rate: 5,
        language: "en",
        printerWidth: 80,
        businessName: "My Store",
        receiptFooter: "Thank you for your purchase!",
        googleDriveLinked: false
      };
      await db.put("settings", defaultSettings);
      setSettings(defaultSettings);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    await db.put("settings", settings);
    if (settings.mode !== mode) {
      setMode(settings.mode);
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = (key: keyof SettingsType, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (!settings) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">System Settings</h2>
        <Button onClick={handleSave} size="sm" className="gap-2">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>POS Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>POS Mode</Label>
              <Select
                value={settings.mode}
                onValueChange={(value) => updateSetting("mode", value as POSMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="cafe">Cafe/Restaurant</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Retail: SKU/item-based sales | Cafe: Modifiers + variants support
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-base font-semibold">Tax Settings</Label>
              
              <div className="space-y-3 border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.tax1Enabled ?? true}
                    onCheckedChange={(checked) => updateSetting("tax1Enabled", checked)}
                  />
                  <Label className="flex-shrink-0">Tax 1</Label>
                  <Input
                    placeholder="Label"
                    value={settings.tax1Label ?? "PPN"}
                    onChange={(e) => updateSetting("tax1Label", e.target.value)}
                    disabled={!settings.tax1Enabled}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="%"
                    value={settings.tax1Rate ?? 10}
                    onChange={(e) => updateSetting("tax1Rate", parseFloat(e.target.value) || 0)}
                    disabled={!settings.tax1Enabled}
                    className="w-20"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.tax1Inclusive ?? false}
                      onCheckedChange={(checked) => updateSetting("tax1Inclusive", checked)}
                      disabled={!settings.tax1Enabled}
                    />
                    <Label className="text-xs whitespace-nowrap">Inclusive</Label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.tax2Enabled ?? false}
                    onCheckedChange={(checked) => updateSetting("tax2Enabled", checked)}
                  />
                  <Label className="flex-shrink-0">Tax 2</Label>
                  <Input
                    placeholder="Label"
                    value={settings.tax2Label ?? "GST"}
                    onChange={(e) => updateSetting("tax2Label", e.target.value)}
                    disabled={!settings.tax2Enabled}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="%"
                    value={settings.tax2Rate ?? 5}
                    onChange={(e) => updateSetting("tax2Rate", parseFloat(e.target.value) || 0)}
                    disabled={!settings.tax2Enabled}
                    className="w-20"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Tax 1 can be inclusive (price includes tax). Tax 2 is always exclusive (added on top).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => updateSetting("language", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="id">🇮🇩 Indonesia</SelectItem>
                  <SelectItem value="zh">🇨🇳 中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Price Override</Label>
                <p className="text-xs text-slate-500">
                  Let cashiers adjust item prices during checkout
                </p>
              </div>
              <Switch
                checked={settings.allowPriceOverride ?? false}
                onCheckedChange={(checked) => updateSetting("allowPriceOverride", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Printer Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Receipt Width</Label>
              <Select
                value={settings.printerWidth?.toString() ?? "80"}
                onValueChange={(value) => updateSetting("printerWidth", parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58">58mm</SelectItem>
                  <SelectItem value="80">80mm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bluetooth Printer</Label>
                <p className="text-xs text-slate-500">Connect via Bluetooth</p>
              </div>
              <Button variant="outline" size="sm">
                Connect
              </Button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              ℹ️ Bluetooth printer connection will be available in Capacitor native app
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={settings.businessName ?? ""}
                onChange={(e) => updateSetting("businessName", e.target.value)}
                placeholder="My Store"
              />
            </div>

            <div className="space-y-2">
              <Label>Receipt Footer Text</Label>
              <Input
                value={settings.receiptFooter ?? ""}
                onChange={(e) => updateSetting("receiptFooter", e.target.value)}
                placeholder="Thank you for your purchase!"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Drive Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Google Drive Status</Label>
                <p className="text-xs text-slate-500">
                  {settings.googleDriveLinked ? "✅ Connected" : "❌ Not connected"}
                </p>
              </div>
              <Button
                variant={settings.googleDriveLinked ? "outline" : "default"}
                size="sm"
                onClick={() => updateSetting("googleDriveLinked", !settings.googleDriveLinked)}
              >
                {settings.googleDriveLinked ? "Disconnect" : "Connect"}
              </Button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              ℹ️ Backup triggers automatically on cashier logout. Calendar events pushed to admin account.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}