import { Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "./HelpTooltip";
import { translate } from "@/lib/translations";
import type { Language, Settings } from "@/types";
import { useRef, useEffect, useState } from "react";

interface BusinessSettingsSectionProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  language: Language;
}

export function BusinessSettingsSection({
  settings,
  onUpdate,
  language,
}: BusinessSettingsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [grayscalePreview, setGrayscalePreview] = useState<string | null>(null);

  useEffect(() => {
    if (settings.receiptLogoBase64) {
      convertToGrayscale(settings.receiptLogoBase64);
    } else {
      loadDefaultLogo();
    }
  }, [settings.receiptLogoBase64]);

  const loadDefaultLogo = async () => {
    try {
      const response = await fetch("/logowtext.png");
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const processed = processImage(img);
          if (processed) {
            onUpdate({ receiptLogoBase64: processed });
          }
        };
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to load default logo:", error);
    }
  };

  const processImage = (img: HTMLImage): string | null => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const targetWidth = 512;
    const scale = targetWidth / img.width;
    canvas.width = targetWidth;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const level = Math.floor(gray / 16);
      const grayscale16 = level * 16;
      
      data[i] = grayscale16;
      data[i + 1] = grayscale16;
      data[i + 2] = grayscale16;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const convertToGrayscale = (base64Image: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const level = Math.floor(gray / 16);
        const grayscale16 = level * 16;
        
        data[i] = grayscale16;
        data[i + 1] = grayscale16;
        data[i + 2] = grayscale16;
      }

      ctx.putImageData(imageData, 0, 0);
      setGrayscalePreview(canvas.toDataURL());
    };
    img.src = base64Image;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const processed = processImage(img);
        if (processed) {
          onUpdate({ receiptLogoBase64: processed });
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        alert("Failed to load image");
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onUpdate({ receiptLogoBase64: undefined });
    setGrayscalePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5" />
        <h3 className="text-lg font-semibold">
          {translate("settings.business.businessInformation", language)}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {translate("settings.business.receiptLogo", language)}
            <HelpTooltip content={translate("settings.business.uploadLogoHelp", language)} />
          </Label>
          
          {grayscalePreview && (
            <div className="relative inline-block">
              <img
                src={grayscalePreview}
                alt="Receipt Logo Preview (16-level grayscale)"
                className="max-w-[200px] border rounded-lg p-2 bg-white"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveLogo}
              >
                ×
              </Button>
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? translate("settings.business.processing", language) : translate("settings.business.uploadLogo", language)}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            {translate("settings.business.businessName", language)} *
          </Label>
          <Input
            value={settings.businessName || ""}
            onChange={(e) => onUpdate({ businessName: e.target.value })}
            placeholder=""
            className={!settings.businessName ? "opacity-50" : ""}
          />
          {!settings.businessName && (
            <p className="text-sm text-muted-foreground opacity-50">
              {translate("settings.business.businessNamePlaceholder", language)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {translate("settings.business.address", language)}
            <HelpTooltip content={translate("settings.business.addressHint", language)} />
          </Label>
          <Textarea
            value={settings.businessAddress || ""}
            onChange={(e) => onUpdate({ businessAddress: e.target.value })}
            placeholder=""
            rows={3}
            className={!settings.businessAddress ? "opacity-50" : ""}
          />
          {!settings.businessAddress && (
            <p className="text-sm text-muted-foreground opacity-50">
              {translate("settings.business.addressPlaceholder", language)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {translate("settings.business.taxId", language)}
            <HelpTooltip content={translate("settings.business.taxIdHint", language)} />
          </Label>
          <Input
            value={settings.businessTaxId || ""}
            onChange={(e) => onUpdate({ businessTaxId: e.target.value })}
            placeholder=""
            className={!settings.businessTaxId ? "opacity-50" : ""}
          />
          {!settings.businessTaxId && (
            <p className="text-sm text-muted-foreground opacity-50">
              {translate("settings.business.taxIdPlaceholder", language)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {translate("settings.business.receiptFooter", language)}
            <HelpTooltip content={translate("settings.business.receiptFooterHint", language)} />
          </Label>
          <Textarea
            value={settings.receiptFooter || ""}
            onChange={(e) => onUpdate({ receiptFooter: e.target.value })}
            placeholder=""
            rows={2}
            className={!settings.receiptFooter ? "opacity-50" : ""}
          />
          {!settings.receiptFooter && (
            <p className="text-sm text-muted-foreground opacity-50">
              {translate("settings.business.receiptFooterPlaceholder", language)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}