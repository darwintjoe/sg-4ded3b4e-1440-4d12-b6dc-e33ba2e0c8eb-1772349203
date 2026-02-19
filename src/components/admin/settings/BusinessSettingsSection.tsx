import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Store } from "lucide-react";
import { Settings } from "@/types";
import { HelpTooltip } from "./HelpTooltip";

interface BusinessSettingsSectionProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
}

export function BusinessSettingsSection({ settings, onUpdate }: BusinessSettingsSectionProps) {
  return (
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
            onChange={(e) => onUpdate({ businessName: e.target.value })}
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
            onChange={(e) => onUpdate({ businessAddress: e.target.value })}
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
            onChange={(e) => onUpdate({ taxId: e.target.value })}
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
            onChange={(e) => onUpdate({ receiptFooter: e.target.value })}
            placeholder="Thank you!"
            rows={2}
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  );
}