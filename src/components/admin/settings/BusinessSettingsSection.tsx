import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Store, Upload, X } from "lucide-react";
import { Settings } from "@/types";
import { HelpTooltip } from "./HelpTooltip";
import { translate } from "@/lib/translations";
import { Language } from "@/types";
import { processLogoForReceipt, loadDefaultLogo } from "@/lib/imageProcessing";
import { useRef, useState, useEffect } from "react";

interface BusinessSettingsSectionProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  language: Language;
}

export function BusinessSettingsSection({ settings, onUpdate, language }: BusinessSettingsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(settings.businessLogo);

  useEffect(() => {
    // Load default logo on mount if no logo exists
    if (!settings.businessLogo) {
      loadDefaultLogo("/logowtext.png")
        .then((dataUrl) => {
          setLogoPreview(dataUrl);
          onUpdate({ businessLogo: dataUrl });
        })
        .catch((err) => {
          console.warn("Could not load default logo:", err);
        });
    } else {
      setLogoPreview(settings.businessLogo);
    }
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setIsProcessing(true);
    try {
      const processed = await processLogoForReceipt(file, 512);
      setLogoPreview(processed.dataUrl);
      onUpdate({ businessLogo: processed.dataUrl });
    } catch (error) {
      console.error("Failed to process logo:", error);
      alert("Failed to process image. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(undefined);
    onUpdate({ businessLogo: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Store className="h-4 w-4" />
        {translate("settings.business.title", language)}
      </h3>
      <div className="space-y-3">
        {/* Logo Upload */}
        <div>
          <Label className="text-sm">
            Receipt Logo
            <HelpTooltip content="Upload logo for receipt printing. Auto-resized to 512px width, converted to grayscale for thermal printers." />
          </Label>
          <div className="mt-1 space-y-2">
            {/* Logo Preview */}
            {logoPreview && (
              <div className="relative inline-block">
                <img
                  src={logoPreview}
                  alt="Business Logo"
                  className="h-24 w-auto border rounded bg-white object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={handleRemoveLogo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : logoPreview ? "Change Logo" : "Upload Logo"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>
        </div>

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
            className="mt-1 placeholder:opacity-50"
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
            className="mt-1 placeholder:opacity-50"
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
            className="mt-1 placeholder:opacity-50"
          />
        </div>
      </div>
    </Card>
  );
}