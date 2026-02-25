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

// Max width for thermal printers: 58mm = 384 dots, 80mm = 576 dots
// Use 384 as safe maximum for both
const THERMAL_PRINTER_WIDTH = 384;

export function BusinessSettingsSection({
  settings,
  onUpdate,
  language,
}: BusinessSettingsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [monochromePreview, setMonochromePreview] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // If logo is set (non-empty string), generate preview from it
    if (settings.receiptLogoBase64) {
      generateMonochromePreview(settings.receiptLogoBase64);
      setIsInitializing(false);
    } 
    // If logo is undefined (first load/not set), load default SellMore logo
    else if (settings.receiptLogoBase64 === undefined) {
      loadDefaultLogo();
    } else {
      // Empty string means user explicitly removed it
      setMonochromePreview(null);
      setIsInitializing(false);
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
          const processed = processImageForThermalPrinter(img);
          if (processed) {
            onUpdate({ receiptLogoBase64: processed });
          }
          setIsInitializing(false);
        };
        img.onerror = () => {
          console.error("Failed to load default logo image");
          setIsInitializing(false);
        };
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to load default logo:", error);
      setIsInitializing(false);
    }
  };

  /**
   * Process image for thermal printer:
   * 1. Resize to max 384px width (fits 58mm and 80mm printers)
   * 2. Convert to 1-bit monochrome using Floyd-Steinberg dithering
   * 3. Output as PNG with only black/white pixels
   */
  const processImageForThermalPrinter = (img: HTMLImageElement): string | null => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Calculate dimensions - max width 384px for thermal printers
    const scale = Math.min(1, THERMAL_PRINTER_WIDTH / img.width);
    const width = Math.floor(img.width * scale);
    const height = Math.floor(img.height * scale);

    canvas.width = width;
    canvas.height = height;

    // Draw image with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert to grayscale array for dithering
    const grayscale: number[][] = [];
    for (let y = 0; y < height; y++) {
      grayscale[y] = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Luminance formula
        grayscale[y][x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      }
    }

    // Apply Floyd-Steinberg dithering for better 1-bit output
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const oldPixel = grayscale[y][x];
        const newPixel = oldPixel < 128 ? 0 : 255;
        grayscale[y][x] = newPixel;
        const error = oldPixel - newPixel;

        // Distribute error to neighbors
        if (x + 1 < width) {
          grayscale[y][x + 1] += error * 7 / 16;
        }
        if (y + 1 < height) {
          if (x > 0) {
            grayscale[y + 1][x - 1] += error * 3 / 16;
          }
          grayscale[y + 1][x] += error * 5 / 16;
          if (x + 1 < width) {
            grayscale[y + 1][x + 1] += error * 1 / 16;
          }
        }
      }
    }

    // Write back to image data as pure black/white
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const value = grayscale[y][x] < 128 ? 0 : 255;
        data[idx] = value;     // R
        data[idx + 1] = value; // G
        data[idx + 2] = value; // B
        data[idx + 3] = 255;   // A (fully opaque)
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  /**
   * Generate monochrome preview that simulates thermal print output
   */
  const generateMonochromePreview = (base64Image: string) => {
    const img = new Image();
    img.onload = () => {
      // The stored image should already be processed, just show it
      setMonochromePreview(base64Image);
    };
    img.onerror = () => {
      setMonochromePreview(null);
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
        const processed = processImageForThermalPrinter(img);
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
    // Set to empty string to indicate explicit removal
    onUpdate({ receiptLogoBase64: "" });
    setMonochromePreview(null);
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
          
          {monochromePreview && (
            <div className="relative inline-block">
              {/* Simulate thermal paper with slightly off-white background */}
              <div className="border rounded-lg p-3 bg-[#f5f5f0] shadow-inner">
                <img
                  src={monochromePreview}
                  alt="Receipt Logo Preview (thermal print simulation)"
                  className="max-w-[200px]"
                  style={{ imageRendering: "pixelated" }}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Thermal print preview
                </p>
              </div>
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
              disabled={isProcessing || isInitializing}
            >
              {isProcessing ? translate("settings.business.processing", language) : translate("settings.business.uploadLogo", language)}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Image will be resized to max {THERMAL_PRINTER_WIDTH}px and converted to black/white for thermal printing
          </p>
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