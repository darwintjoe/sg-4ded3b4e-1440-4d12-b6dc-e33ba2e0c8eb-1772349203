import { useState, useEffect, useRef } from "react";
import { X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Html5Qrcode } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import { Language } from "@/types";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  language: Language;
}

const translations = {
  en: {
    title: "Scan Barcode",
    close: "Close",
    scanning: "Ready to scan...",
    scanned: "Scanned!",
  },
  id: {
    title: "Pindai Barcode",
    close: "Tutup",
    scanning: "Siap memindai...",
    scanned: "Terpindai!",
  },
  zh: {
    title: "扫描条形码",
    close: "关闭",
    scanning: "准备扫描...",
    scanned: "已扫描!",
  },
};

export function BarcodeScanner({ isOpen, onClose, onScan, language }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();
  const t = translations[language];

  // Play simple beep/ding sound on successful scan
  const playDingSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Higher pitch, short duration for a "beep"
      oscillator.frequency.value = 1200; 
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.error("Error playing ding sound:", error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure container is rendered
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      if (scannerRef.current) return;

      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.77,
        },
        (decodedText) => {
          // 1. Play ding sound
          playDingSound();
          
          // 2. Show non-blocking toast
          toast({
            title: t.scanned,
            description: decodedText,
            duration: 1500,
            className: "bg-green-600 text-white border-none",
          });
          
          // 3. Send barcode to parent (adds to cart)
          onScan(decodedText);
          
          // 4. Scanner STAYS OPEN for rapid scanning
        },
        () => {
          // Ignore scan failures/scanning errors
        }
      );

      setIsScanning(true);
    } catch (error) {
      console.error("Error starting scanner:", error);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] bg-black h-[40vh] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] border-t border-slate-800 flex flex-col">
      {/* Header / Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="animate-pulse h-2 w-2 rounded-full bg-red-500"/>
          <h2 className="text-sm font-medium">{t.scanning}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Minimize2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Scanner Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden">
        <div id="barcode-reader" className="w-full h-full [&>div]:!shadow-none [&>video]:object-cover" />
        
        {/* Visual Guide Overlay (Optional) */}
        <div className="absolute inset-0 pointer-events-none border-2 border-white/10 flex items-center justify-center">
          <div className="w-[80%] h-[1px] bg-red-500/50 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
        </div>
      </div>
    </div>
  );
}