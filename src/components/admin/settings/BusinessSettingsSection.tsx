import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Store } from "lucide-react";
import { Settings } from "@/types";
import { HelpTooltip } from "./HelpTooltip";
import { translate } from "@/lib/translations";
import { Language } from "@/types";

interface BusinessSettingsSectionProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  language: Language;
}

export function BusinessSettingsSection({ settings, onUpdate, language }: BusinessSettingsSectionProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Store className="h-4 w-4" />
        {translate("settings.business.title", language)}
      </h3>
      <div className="space-y-3">
        <div>
          <Label htmlFor="businessName" className="text-sm">
            {translate("settings.business.name", language)} *
          </Label>
          <Input
            id="businessName"
            value={settings.businessName}
            onChange={(e) => onUpdate({ businessName: e.target.value })}
            placeholder={translate("settings.business.namePlaceholder", language)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="businessAddress" className="text-sm">
            {translate("settings.business.address", language)}
            <HelpTooltip content={translate("settings.business.addressHint", language)} />
          </Label>
          <Textarea
            id="businessAddress"
            value={settings.businessAddress || ""}
            onChange={(e) => onUpdate({ businessAddress: e.target.value })}
            placeholder={translate("settings.business.addressPlaceholder", language)}
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="taxId" className="text-sm">
            {translate("settings.business.taxId", language)}
            <HelpTooltip content={translate("settings.business.taxIdHint", language)} />
          </Label>
          <Input
            id="taxId"
            value={settings.taxId || ""}
            onChange={(e) => onUpdate({ taxId: e.target.value })}
            placeholder={translate("settings.business.taxIdPlaceholder", language)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="receiptFooter" className="text-sm">
            {translate("settings.business.receiptFooter", language)}
            <HelpTooltip content={translate("settings.business.receiptFooterHint", language)} />
          </Label>
          <Textarea
            id="receiptFooter"
            value={settings.receiptFooter || ""}
            onChange={(e) => onUpdate({ receiptFooter: e.target.value })}
            placeholder={translate("settings.business.receiptFooterPlaceholder", language)}
            rows={2}
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  );
}