import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";
import { translate } from "@/lib/translations";
import { Language } from "@/types";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  language: Language;
}

export function BarcodeScanner({ onScan, onClose, language }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    let mounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startScanning = async () => {
      try {
        const videoInputDevices = await reader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError(translate("scanner.noCamera", language));
          return;
        }

        // Prefer back camera on mobile devices
        const selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes("back") || 
          device.label.toLowerCase().includes("rear")
        ) || videoInputDevices[0];

        if (!videoRef.current || !mounted) return;

        await reader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current,
          (result, error) => {
            if (!mounted || !isScanning) return;

            if (result) {
              const code = result.getText();
              // Avoid duplicate scans within 1 second
              if (code !== lastScanned) {
                setLastScanned(code);
                onScan(code);
                
                // Brief pause to show visual feedback
                setIsScanning(false);
                setTimeout(() => {
                  if (mounted) {
                    setIsScanning(true);
                    setLastScanned(null);
                  }
                }, 1000);
              }
            }

            if (error && !(error instanceof NotFoundException)) {
              console.error("Barcode scan error:", error);
            }
          }
        );
      } catch (err) {
        console.error("Camera access error:", err);
        setError(translate("scanner.cameraError", language));
      }
    };

    startScanning();

    return () => {
      mounted = false;
      reader.reset();
    };
  }, [onScan, language, lastScanned, isScanning]);

  const handleClose = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-white font-bold text-lg">
                {translate("scanner.title", language)}
              </h2>
              <p className="text-white/70 text-sm">
                {translate("scanner.instruction", language)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="absolute inset-0 flex items-center justify-center">
        {error ? (
          <div className="text-center p-6">
            <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-6 max-w-sm">
              <p className="text-white text-lg font-semibold mb-2">
                {translate("scanner.error", language)}
              </p>
              <p className="text-white/80 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scan Frame Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Scanning Frame */}
                <div className="w-72 h-48 border-4 border-white/50 rounded-lg relative">
                  {/* Corner Markers */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                  
                  {/* Scanning Line Animation */}
                  {isScanning && (
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                      <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
                    </div>
                  )}
                </div>
                
                {/* Success Feedback */}
                {!isScanning && lastScanned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg animate-pulse">
                      ✓ {translate("scanner.scanned", language)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm p-6">
        <div className="text-center space-y-2">
          <p className="text-white/90 text-sm">
            {translate("scanner.tip", language)}
          </p>
          {lastScanned && (
            <div className="bg-white/10 rounded-lg px-4 py-2 inline-block">
              <p className="text-white/70 text-xs mb-1">
                {translate("scanner.lastScanned", language)}
              </p>
              <p className="text-white font-mono font-bold">{lastScanned}</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}