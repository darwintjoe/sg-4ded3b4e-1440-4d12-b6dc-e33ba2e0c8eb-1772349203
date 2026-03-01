import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Camera, RefreshCw } from "lucide-react";
import { translate } from "@/lib/translations";
import { Language } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { playBeepSound } from "@/lib/utils";

interface BarcodeScannerProps {
  isOpen: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
  language: Language;
}

export function BarcodeScanner({ isOpen, onScan, onClose, language }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cooldownRef = useRef(false);
  const { toast } = useToast();

  const t = {
    en: {
      title: "Scan Barcode",
      ready: "Ready to scan",
      scanned: "Scanned!",
      error: "Camera access denied",
      close: "Close"
    },
    id: {
      title: "Pindai Barcode",
      ready: "Siap memindai",
      scanned: "Terpindai!",
      error: "Akses kamera ditolak",
      close: "Tutup"
    },
    zh: {
      title: "扫描条形码",
      ready: "准备扫描",
      scanned: "已扫描!",
      error: "相机访问被拒绝",
      close: "关闭"
    }
  }[language];

  // Play ding sound on successful scan
  const playDingSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      // Audio not supported, continue silently
    }
  };

  // Reset state when scanner closes
  useEffect(() => {
    if (!isOpen) {
      setLastScannedCode(null);
      setScanCooldown(false);
      cooldownRef.current = false;
    }
  }, [isOpen]);

  // Main scanner effect - only depends on isOpen
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    let animationFrameId: number | null = null;

    const startScanner = async () => {
      try {
        setError(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();

          if ("BarcodeDetector" in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"]
            });

            const detectBarcode = async () => {
              if (!mounted || !videoRef.current) return;

              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                
                // Only process if not in cooldown (use ref for immediate check)
                if (barcodes.length > 0 && !cooldownRef.current) {
                  const barcode = barcodes[0].rawValue;
                  
                  // Set cooldown immediately via ref (prevents duplicate scans)
                  cooldownRef.current = true;
                  
                  // Update UI state
                  setScanCooldown(true);
                  setLastScannedCode(barcode);
                  
                  // Play sound and notify
                  playDingSound();
                  onScan(barcode);
                  
                  toast({
                    title: `✓ ${barcode}`,
                    duration: 1500,
                  });

                  // Reset cooldown after 2 seconds - DO NOT check mounted here
                  // The timeout should always reset cooldown state
                  setTimeout(() => {
                    cooldownRef.current = false;
                    setScanCooldown(false);
                    setLastScannedCode(null);
                  }, 2000);
                }
              } catch (err) {
                // Silently continue scanning
              }

              if (mounted) {
                animationFrameId = requestAnimationFrame(detectBarcode);
              }
            };

            detectBarcode();
          }
        }
      } catch (err) {
        if (mounted) {
          setError(t.error);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, onScan, toast, t.error]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[40vh] z-[100] bg-black shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2">
          {scanCooldown ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs font-medium text-green-500">{t.scanned}</span>
              {lastScannedCode && (
                <span className="text-xs font-mono text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                  {lastScannedCode}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-blue-500">{t.ready}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className={`w-[80%] h-[2px] transition-all duration-300 ${
              scanCooldown 
                ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,1)]" 
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"
            }`}
          >
            <div className={`absolute top-1/2 left-0 w-2 h-2 transform -translate-y-1/2 -translate-x-1/2 ${
              scanCooldown ? "bg-green-500" : "bg-red-500"
            }`} />
            <div className={`absolute top-1/2 right-0 w-2 h-2 transform -translate-y-1/2 translate-x-1/2 ${
              scanCooldown ? "bg-green-500" : "bg-red-500"
            }`} />
          </div>
          <div className={`absolute text-[10px] mt-8 font-mono tracking-wider transition-colors duration-300 ${
            scanCooldown ? "text-green-500/80" : "text-red-500/80"
          }`}>
            {scanCooldown ? "✓ ADDED" : "SCAN"}
          </div>
        </div>

        {scanCooldown && (
          <div className="absolute inset-0 bg-green-500/10 animate-pulse pointer-events-none" />
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-red-500 font-medium px-4 text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}