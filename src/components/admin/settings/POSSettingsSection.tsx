import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, CreditCard, DollarSign, Wallet } from "lucide-react";
import { Settings } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { HelpTooltip } from "./HelpTooltip";

interface POSSettingsSectionProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
}

export function POSSettingsSection({ settings, onUpdate }: POSSettingsSectionProps) {
  const { language } = useApp();
  const t = {
    "settings.shiftManagement": language === "id" ? "Manajemen Shift" : "Shift Management",
    "settings.paymentMethods": language === "id" ? "Metode Pembayaran" : "Payment Methods",
    "settings.priceOverride": language === "id" ? "Ubah Harga" : "Price Override",
    "settings.taxConfiguration": language === "id" ? "Konfigurasi Pajak" : "Tax Configuration",
  };

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

  return (
    <div className="space-y-4">
      {/* Shift Management */}
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
                onCheckedChange={(checked) => updateShift('shift1', { enabled: checked })}
              />
            </div>
            {getSafeShifts(settings).shift1.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift1.startTime}
                    onChange={(e) => updateShift('shift1', { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End</Label>
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
              <Label className="text-sm font-medium">Shift 2</Label>
              <Switch
                checked={getSafeShifts(settings).shift2.enabled}
                onCheckedChange={(checked) => updateShift('shift2', { enabled: checked })}
              />
            </div>
            {getSafeShifts(settings).shift2.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift2.startTime}
                    onChange={(e) => updateShift('shift2', { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End</Label>
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
              <Label className="text-sm font-medium">Shift 3</Label>
              <Switch
                checked={getSafeShifts(settings).shift3.enabled}
                onCheckedChange={(checked) => updateShift('shift3', { enabled: checked })}
              />
            </div>
            {getSafeShifts(settings).shift3.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={getSafeShifts(settings).shift3.startTime}
                    onChange={(e) => updateShift('shift3', { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End</Label>
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
              onCheckedChange={(checked) => 
                onUpdate({ paymentMethods: { ...settings.paymentMethods, cash: checked } })
              }
            />
          </div>

          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Card (Debit/Credit)</span>
            </div>
            <Switch
              checked={settings.paymentMethods?.card !== false}
              onCheckedChange={(checked) => 
                onUpdate({ paymentMethods: { ...settings.paymentMethods, card: checked } })
              }
            />
          </div>

          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-purple-600" />
              <span className="text-sm">E-Wallet (GoPay, OVO, Dana)</span>
            </div>
            <Switch
              checked={settings.paymentMethods?.ewallet !== false}
              onCheckedChange={(checked) => 
                onUpdate({ paymentMethods: { ...settings.paymentMethods, ewallet: checked } })
              }
            />
          </div>

          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
              <span className="text-sm">QR Code (QRIS)</span>
            </div>
            <Switch
              checked={settings.paymentMethods?.qr !== false}
              onCheckedChange={(checked) => 
                onUpdate({ paymentMethods: { ...settings.paymentMethods, qr: checked } })
              }
            />
          </div>

          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-600" />
              <span className="text-sm">Bank Transfer</span>
            </div>
            <Switch
              checked={settings.paymentMethods?.transfer !== false}
              onCheckedChange={(checked) => 
                onUpdate({ paymentMethods: { ...settings.paymentMethods, transfer: checked } })
              }
            />
          </div>
        </div>
      </Card>

      {/* Price Override */}
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
            onCheckedChange={(checked) => onUpdate({ allowPriceOverride: checked })}
          />
        </div>
      </Card>

      {/* Tax Configuration */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          {t["settings.taxConfiguration"]}
        </h3>
        
        <div className="space-y-4">
          {/* Tax 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Input
                value={settings.tax1Label}
                onChange={(e) => onUpdate({ tax1Label: e.target.value })}
                placeholder="Tax 1 (Primary)"
                className="flex-1"
              />
              <Switch
                checked={settings.tax1Enabled}
                onCheckedChange={(checked) => onUpdate({ tax1Enabled: checked })}
              />
            </div>
            
            {settings.tax1Enabled && (
              <div className="flex items-center gap-3 pl-4">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Rate (%)</Label>
                <Input
                  type="number"
                  value={settings.tax1Rate}
                  onChange={(e) => onUpdate({ tax1Rate: Number(e.target.value) })}
                  className="w-20"
                />
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Tax Inclusive</Label>
                <Switch
                  checked={settings.tax1Inclusive || false}
                  onCheckedChange={(checked) => onUpdate({ tax1Inclusive: checked })}
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
                placeholder="Tax 2 (Secondary)"
                className="flex-1"
              />
              <Switch
                checked={settings.tax2Enabled}
                onCheckedChange={(checked) => onUpdate({ tax2Enabled: checked })}
              />
            </div>
            
            {settings.tax2Enabled && (
              <div className="flex items-center gap-3 pl-4">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Rate (%)</Label>
                <Input
                  type="number"
                  value={settings.tax2Rate}
                  onChange={(e) => onUpdate({ tax2Rate: Number(e.target.value) })}
                  className="w-20"
                />
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Tax Inclusive</Label>
                <Switch
                  checked={settings.tax2Inclusive || false}
                  onCheckedChange={(checked) => onUpdate({ tax2Inclusive: checked })}
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}