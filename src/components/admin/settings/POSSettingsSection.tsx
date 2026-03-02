import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Clock, CreditCard, DollarSign, Wallet, QrCode, Ticket, Upload, X, Receipt, Moon, Sun, Monitor } from "lucide-react";
import { Settings, Language } from "@/types";
import { HelpTooltip } from "./HelpTooltip";
import { translate } from "@/lib/translations";
import { useRef, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface POSSettingsSectionProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  language: Language;
}

export function POSSettingsSection({ settings, onUpdate, language }: POSSettingsSectionProps) {
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingQR, setUploadingQR] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getSafeShifts = (s: Settings) => {
    return s.shifts || {
      shift1: { enabled: true, name: "Morning Shift", startTime: "09:00", endTime: "18:00" },
      shift2: { enabled: false, name: "Afternoon Shift", startTime: "14:00", endTime: "22:00" },
      shift3: { enabled: false, name: "Night Shift", startTime: "22:00", endTime: "06:00" },
    };
  };

  const updateShift = (key: string, update: any) => {
    const currentShifts = getSafeShifts(settings);
    const targetShift = currentShifts[key as keyof typeof currentShifts];
    
    const newShifts = {
      ...currentShifts,
      [key]: { ...targetShift, ...update }
    };
    
    onUpdate({ shifts: newShifts });
  };

  const getSafePaymentMethods = () => {
    return settings.paymentMethods || {
      cash: true,
      qrisStatic: true,
      qrisDynamic: false,
      card: false,
      voucher: false,
      transfer: false
    };
  };

  const updatePaymentMethod = (method: string, enabled: boolean) => {
    const current = getSafePaymentMethods();
    onUpdate({
      paymentMethods: {
        ...current,
        [method]: enabled
      }
    });
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    onUpdate({ theme: newTheme });
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQR(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onUpdate({ qrisStaticImage: base64 });
        setUploadingQR(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading QR code:", error);
      setUploadingQR(false);
    }
  };

  const removeQRCode = () => {
    onUpdate({ qrisStaticImage: "" });
    if (qrFileInputRef.current) {
      qrFileInputRef.current.value = "";
    }
  };

  // Sync theme from settings on mount
  useEffect(() => {
    if (mounted && settings.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [mounted, settings.theme, theme, setTheme]);

  // Prevent hydration mismatch - don't render theme buttons until mounted
  if (!mounted) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            {translate("settings.pos.theme", language)}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" disabled>
              <Sun className="h-4 w-4" />
              <span className="text-xs">{translate("settings.pos.light", language)}</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" disabled>
              <Moon className="h-4 w-4" />
              <span className="text-xs">{translate("settings.pos.dark", language)}</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" disabled>
              <Monitor className="h-4 w-4" />
              <span className="text-xs">{translate("settings.pos.system", language)}</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Theme Selection */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Sun className="w-4 h-4" />
          {translate("settings.pos.theme", language)}
        </h3>
        
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => handleThemeChange("light")}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Sun className="h-4 w-4" />
            <span className="text-xs">{translate("settings.pos.light", language)}</span>
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => handleThemeChange("dark")}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Moon className="h-4 w-4" />
            <span className="text-xs">{translate("settings.pos.dark", language)}</span>
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            onClick={() => handleThemeChange("system")}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Monitor className="h-4 w-4" />
            <span className="text-xs">{translate("settings.pos.system", language)}</span>
          </Button>
        </div>
      </Card>

      {/* Shift Management */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {translate("settings.pos.shiftManagement", language)}
        </h3>

        <div className="space-y-4">
          {/* Shift 1 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{translate("settings.pos.shift1", language)}</Label>
              <Switch
                checked={getSafeShifts(settings).shift1.enabled}
                onCheckedChange={(checked) => updateShift('shift1', { enabled: checked })}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
            {getSafeShifts(settings).shift1.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{translate("settings.pos.start", language)}</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift1.startTime}
                    onChange={(e) => updateShift('shift1', { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{translate("settings.pos.end", language)}</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift1.endTime}
                    onChange={(e) => updateShift('shift1', { endTime: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Shift 2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{translate("settings.pos.shift2", language)}</Label>
              <Switch
                checked={getSafeShifts(settings).shift2.enabled}
                onCheckedChange={(checked) => updateShift('shift2', { enabled: checked })}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
            {getSafeShifts(settings).shift2.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{translate("settings.pos.start", language)}</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift2.startTime}
                    onChange={(e) => updateShift('shift2', { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{translate("settings.pos.end", language)}</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift2.endTime}
                    onChange={(e) => updateShift('shift2', { endTime: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Shift 3 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{translate("settings.pos.shift3", language)}</Label>
              <Switch
                checked={getSafeShifts(settings).shift3.enabled}
                onCheckedChange={(checked) => updateShift('shift3', { enabled: checked })}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
            {getSafeShifts(settings).shift3.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{translate("settings.pos.start", language)}</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift3.startTime}
                    onChange={(e) => updateShift('shift3', { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{translate("settings.pos.end", language)}</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift3.endTime}
                    onChange={(e) => updateShift('shift3', { endTime: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Payment Methods */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          {translate("settings.pos.paymentMethods", language)}
          <HelpTooltip content={translate("settings.pos.paymentMethodsHint", language)} />
        </h3>

        <div className="space-y-2">
          {/* Cash */}
          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm">{translate("payment.cash", language)}</span>
            </div>
            <Switch
              checked={getSafePaymentMethods().cash !== false}
              onCheckedChange={(checked) => updatePaymentMethod('cash', checked)}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
            />
          </div>

          {/* QRIS Static */}
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{translate("payment.qrisStatic", language)}</span>
              </div>
              <Switch
                checked={getSafePaymentMethods().qrisStatic !== false}
                onCheckedChange={(checked) => updatePaymentMethod('qrisStatic', checked)}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
            
            {/* QRIS Static Configuration */}
            {getSafePaymentMethods().qrisStatic !== false && (
              <div className="px-2 pb-2 space-y-2 border-t pt-2">
                <Label className="text-xs text-muted-foreground">
                  {translate("settings.pos.qrisStaticImage", language)}
                </Label>
                
                {settings.qrisStaticImage ? (
                  <div className="relative inline-block">
                    <img 
                      src={settings.qrisStaticImage} 
                      alt="QRIS Static QR Code" 
                      className="w-32 h-32 border rounded"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeQRCode}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={qrFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQRUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => qrFileInputRef.current?.click()}
                      disabled={uploadingQR}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {uploadingQR ? translate("common.loading", language) : translate("settings.pos.uploadQR", language)}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QRIS Dynamic */}
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-purple-600" />
                <span className="text-sm">{translate("payment.qrisDynamic", language)}</span>
              </div>
              <Switch
                checked={getSafePaymentMethods().qrisDynamic === true}
                onCheckedChange={(checked) => updatePaymentMethod('qrisDynamic', checked)}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
            
            {/* QRIS Dynamic Configuration */}
            {getSafePaymentMethods().qrisDynamic === true && (
              <div className="px-2 pb-2 space-y-2 border-t pt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {translate("settings.pos.qrisDynamicEndpoint", language)}
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://api.payment-provider.com/qr/generate"
                    value={settings.qrisDynamicEndpoint || ""}
                    onChange={(e) => onUpdate({ qrisDynamicEndpoint: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {translate("settings.pos.qrisDynamicApiKey", language)}
                  </Label>
                  <Input
                    type="password"
                    placeholder="sk_live_..."
                    value={settings.qrisDynamicApiKey || ""}
                    onChange={(e) => onUpdate({ qrisDynamicApiKey: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {translate("settings.pos.qrisDynamicMerchantId", language)}
                  </Label>
                  <Input
                    type="text"
                    placeholder="MERCHANT_12345"
                    value={settings.qrisDynamicMerchantId || ""}
                    onChange={(e) => onUpdate({ qrisDynamicMerchantId: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card Payment */}
          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
              <span className="text-sm">{translate("payment.card", language)}</span>
            </div>
            <Switch
              checked={getSafePaymentMethods().card === true}
              onCheckedChange={(checked) => updatePaymentMethod('card', checked)}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
            />
          </div>

          {/* Voucher */}
          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-pink-600" />
              <span className="text-sm">{translate("payment.voucher", language)}</span>
            </div>
            <Switch
              checked={getSafePaymentMethods().voucher === true}
              onCheckedChange={(checked) => updatePaymentMethod('voucher', checked)}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
            />
          </div>

          {/* Bank Transfer */}
          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-teal-600" />
              <span className="text-sm">{translate("payment.transfer", language)}</span>
            </div>
            <Switch
              checked={getSafePaymentMethods().transfer === true}
              onCheckedChange={(checked) => updatePaymentMethod('transfer', checked)}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
            />
          </div>
        </div>
      </Card>

      {/* Price Override */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{translate("settings.pos.priceOverride", language)}</span>
            <HelpTooltip content={translate("settings.pos.priceOverrideHelp", language)} />
          </div>
          <Switch
            checked={settings.allowPriceOverride}
            onCheckedChange={(checked) => onUpdate({ allowPriceOverride: checked })}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
          />
        </div>
      </Card>

      {/* Tax Configuration */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{translate("settings.taxConfiguration", language)}</span>
        </div>
        
        <div className="space-y-4">
          {/* Tax 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Input
                value={settings.tax1Label}
                onChange={(e) => onUpdate({ tax1Label: e.target.value })}
                placeholder={translate("settings.pos.tax1Label", language)}
                className="flex-1"
              />
              <Switch
                checked={settings.tax1Enabled}
                onCheckedChange={(checked) => onUpdate({ tax1Enabled: checked })}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
            
            {settings.tax1Enabled && (
              <div className="flex items-center gap-3 pl-4">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">{translate("settings.pos.taxRate", language)}</Label>
                <Input
                  type="number"
                  value={settings.tax1Rate}
                  onChange={(e) => onUpdate({ tax1Rate: Number(e.target.value) })}
                  className="w-20"
                />
                <span className="text-xs">%</span>
                <Label className="text-xs text-muted-foreground whitespace-nowrap">{translate("settings.pos.taxInclusive", language)}</Label>
                <Switch
                  checked={settings.tax1Inclusive || false}
                  onCheckedChange={(checked) => onUpdate({ tax1Inclusive: checked })}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
                />
              </div>
            )}
          </div>

          {/* Tax 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Input
                value={settings.tax2Label}
                onChange={(e) => onUpdate({ tax2Label: e.target.value })}
                placeholder={translate("settings.pos.tax2Label", language)}
                className="flex-1"
              />
              <Switch
                checked={settings.tax2Enabled}
                onCheckedChange={(checked) => onUpdate({ tax2Enabled: checked })}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
            
            {settings.tax2Enabled && (
              <div className="flex items-center gap-3 pl-4">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">{translate("settings.pos.taxRate", language)}</Label>
                <Input
                  type="number"
                  value={settings.tax2Rate}
                  onChange={(e) => onUpdate({ tax2Rate: Number(e.target.value) })}
                  className="w-20"
                />
                <span className="text-xs">%</span>
                <Label className="text-xs text-muted-foreground whitespace-nowrap">{translate("settings.pos.taxInclusive", language)}</Label>
                <Switch
                  checked={settings.tax2Inclusive || false}
                  onCheckedChange={(checked) => onUpdate({ tax2Inclusive: checked })}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}