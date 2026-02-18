import { useState, useEffect, useRef } from "react";
import { X, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  isOpen: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
  language: "en" | "id" | "zh";
}

export function BarcodeScanner({ isOpen, onScan, onClose, language }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);
  const { toast } = useToast();

  const t = {
    en: {
      title: "Scan Barcode",
      ready: "Ready to scan",
      processing: "Processing...",
      error: "Camera access denied",
      close: "Close"
    },
    id: {
      title: "Pindai Barcode",
      ready: "Siap memindai",
      processing: "Memproses...",
      error: "Akses kamera ditolak",
      close: "Tutup"
    },
    zh: {
      title: "扫描条形码",
      ready: "准备扫描",
      processing: "处理中...",
      error: "相机访问被拒绝",
      close: "关闭"
    }
  }[language];

  // Play ding sound on successful scan
  const playDingSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880; // Higher pitch "ding" (A5)
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const startScanner = async () => {
      try {
        setIsScanning(true);
        setError(null);

        // Request camera access
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

          // Use Barcode Detection API if available
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
            });
            scannerRef.current = barcodeDetector;

            const detectBarcode = async () => {
              if (!mounted || !videoRef.current || isProcessing) return;

              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0 && !isProcessing) {
                  const now = Date.now();
                  // 2-second debounce between scans
                  if (now - lastScanTime > 2000) {
                    setLastScanTime(now);
                    setIsProcessing(true);
                    
                    const barcode = barcodes[0].rawValue;
                    playDingSound();
                    toast({
                      title: "Scanned: " + barcode,
                      duration: 1500,
                    });
                    onScan(barcode);

                    // Reset processing state after 2 seconds
                    setTimeout(() => {
                      if (mounted) {
                        setIsProcessing(false);
                      }
                    }, 2000);
                  }
                }
              } catch (err) {
                // Silently continue scanning
              }

              if (mounted) {
                requestAnimationFrame(detectBarcode);
              }
            };

            detectBarcode();
          }
        }
      } catch (err) {
        if (mounted) {
          setError(t.error);
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, onScan, lastScanTime, isProcessing, toast, t.error]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[40vh] z-[100] bg-black shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-yellow-500">{t.processing}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-500">{t.ready}</span>
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

      {/* Video Area */}
      <div className="relative flex-1 bg-black overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        
        {/* Red Line Guide - Centered */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80%] h-[1px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] relative">
             <div className="absolute top-1/2 left-0 w-2 h-2 bg-red-500 transform -translate-y-1/2 -translate-x-1/2" />
             <div className="absolute top-1/2 right-0 w-2 h-2 bg-red-500 transform -translate-y-1/2 translate-x-1/2" />
          </div>
          <div className="absolute text-[10px] text-red-500/80 mt-6 font-mono tracking-wider">
            SCAN
          </div>
        </div>

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-red-500 font-medium px-4 text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}