import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentMethod, PaymentRecord, Transaction, DailyItemSales, DailyPaymentSales, Settings } from "@/types";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { CheckCircle2, DollarSign, QrCode, Ticket, Printer, Bluetooth, CreditCard, Wallet, Loader2, Share2 } from "lucide-react";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";
import { useToast } from "@/hooks/use-toast";

// Success sound using audio file
const playSuccessSound = () => {
  try {
    const audio = new Audio("/ka-ching.mp3");
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn("Audio playback failed:", err);
    });
  } catch (error) {
    console.error("Error playing success sound:", error);
  }
};

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  tax: number;
  settings: Settings | null;
}

export function PaymentDialog({ 
  open, 
  onClose, 
  total, 
  subtotal, 
  tax,
  settings
}: PaymentDialogProps) {
  const { language, cart, clearCart, currentUser, mode, currentShift } = useApp();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [qrisRef, setQrisRef] = useState("");
  const [completed, setCompleted] = useState(false);
  const [change, setChange] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  
  // QRIS Flow States
  const [showQrisStaticModal, setShowQrisStaticModal] = useState(false);
  const [showQrisDynamicModal, setShowQrisDynamicModal] = useState(false);
  const [qrisLoading, setQrisLoading] = useState(false);
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string | null>(null);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  
  // Print animation state
  const [printAnimating, setPrintAnimating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Check printer connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsPrinterConnected(bluetoothPrinter.isConnected());
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  // Reset payment state when dialog closes
  useEffect(() => {
    if (!open) {
      setPayments([]);
      setAmount("");
      setQrisRef("");
      setSelectedMethod("cash");
      setCompleted(false);
      setChange(0);
      setLastTransaction(null);
      setShowQrisStaticModal(false);
      setShowQrisDynamicModal(false);
      setQrisLoading(false);
      setDynamicQrUrl(null);
      setPrintAnimating(false);
    }
  }, [open]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  
  useEffect(() => {
    setChange(Math.max(0, totalPaid - total));
  }, [totalPaid, total]);

  useEffect(() => {
    if (remaining > 0) {
      setAmount(remaining.toString());
    }
  }, [remaining]);

  useEffect(() => {
    if (remaining > 0) {
      setAmount(remaining.toString());
    }
  }, [selectedMethod]);

  // Generate receipt number from timestamp
  const generateReceiptNumber = (timestamp: number): string => {
    const seq = Math.floor((timestamp % 100000) / 10);
    return `#${String(seq).padStart(5, "0")}`;
  };

  const initiatePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;

    if (selectedMethod === "qris-static") {
      setShowQrisStaticModal(true);
    } else if (selectedMethod === "qris-dynamic") {
      handleDynamicQris();
    } else {
      addPayment(paymentAmount);
    }
  };

  const handleDynamicQris = async () => {
    const paymentAmount = parseFloat(amount);
    setQrisLoading(true);
    setShowQrisDynamicModal(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      setDynamicQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PAY_${Date.now()}_${paymentAmount}`);
      setQrisLoading(false);

      setTimeout(() => {
        addPayment(paymentAmount);
        setShowQrisDynamicModal(false);
      }, 3000);

    } catch (error) {
      console.error("QRIS Dynamic Error:", error);
      setQrisLoading(false);
      alert("Failed to generate QR Code");
      setShowQrisDynamicModal(false);
    }
  };

  const confirmStaticQris = () => {
    const paymentAmount = parseFloat(amount);
    addPayment(paymentAmount);
    setShowQrisStaticModal(false);
  };

  const addPayment = (paymentAmount: number) => {
    const newPayment: PaymentRecord = {
      method: selectedMethod,
      amount: paymentAmount,
      ...(selectedMethod.includes("qris") && qrisRef ? { qrisRef } : {})
    };

    setPayments(prev => [...prev, newPayment]);
    setAmount("");
    setQrisRef("");
  };

  const completeSale = async () => {
    if (remaining > 0 || !currentUser || !currentShift || !settings) return;

    const transaction: Transaction = {
      timestamp: Date.now(),
      businessDate: currentShift.businessDate,
      shiftId: currentShift.shiftId,
      cashierId: currentUser.id!,
      cashierName: currentUser.name,
      mode,
      items: cart,
      subtotal,
      tax,
      total,
      payments,
      ...(change > 0 ? { change } : {})
    };

    try {
      await db.add("transactions", transaction);

      for (const item of cart) {
        const dailyItem: Omit<DailyItemSales, "id"> = {
          itemId: item.itemId,
          sku: item.sku,
          itemName: item.name,
          businessDate: currentShift.businessDate,
          totalQuantity: item.quantity,
          totalRevenue: item.totalPrice,
          transactionCount: 1
        };
        await db.upsertDailyItemSales(dailyItem);
      }

      for (const p of payments) {
        const dailyPayment: Omit<DailyPaymentSales, "id"> = {
          method: p.method,
          businessDate: currentShift.businessDate,
          totalAmount: p.amount,
          transactionCount: 1
        };
        await db.upsertDailyPaymentSales(dailyPayment);
      }

      setLastTransaction(transaction);
      setCompleted(true);
      clearCart();
      
      const isTraining = mode === "cafe" || mode === "retail" ? false : true;
      toast({
        title: isTraining ? "Practice sale completed" : "Sale completed",
        description: `Transaction saved successfully`,
      });
      
      playSuccessSound();
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Could not save sale",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    }
  };

  const handlePrintBluetooth = async () => {
    if (!lastTransaction || !settings || !currentUser) return;

    setPrintAnimating(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setPrinting(true);
    try {
      const result = await bluetoothPrinter.printReceipt(
        lastTransaction,
        settings,
        currentUser.name
      );

      if (!result.success) {
        alert(`Bluetooth print failed: ${result.error}\n\nTry:\n1. Reconnect printer in Settings\n2. Use Browser Print instead`);
      }
    } catch (error) {
      console.error("Bluetooth print error:", error);
      alert("Failed to print via Bluetooth. Use Browser Print instead.");
    } finally {
      setPrinting(false);
      setTimeout(() => setPrintAnimating(false), 300);
    }
  };

  const handlePrint = async () => {
    setPrintAnimating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    window.print();
    setTimeout(() => setPrintAnimating(false), 500);
  };

  const handleNewSale = () => {
    onClose();
  };

  const handleShareWhatsApp = () => {
    if (!whatsAppNumber || !lastTransaction || !settings) return;

    let cleanNumber = whatsAppNumber.replace(/[\s\-]/g, "").replace(/^\+/, "");
    if (cleanNumber.startsWith("0")) {
      cleanNumber = cleanNumber.substring(1);
    }
    const fullNumber = "62" + cleanNumber;

    const lines: string[] = [];
    lines.push(`*${settings.businessName}*`);
    lines.push("");
    lines.push(`Date: ${new Date(lastTransaction.timestamp).toLocaleString()}`);
    lines.push(`Cashier: ${lastTransaction.cashierName}`);
    lines.push("");
    lines.push("*Items:*");
    lastTransaction.items.forEach((item) => {
      lines.push(`${item.name}`);
      lines.push(`${item.quantity} x ${item.basePrice.toLocaleString()} = ${item.totalPrice.toLocaleString()}`);
    });
    lines.push("");
    lines.push(`*Subtotal: ${lastTransaction.subtotal.toLocaleString()}*`);
    if (settings.tax1Enabled) {
      const t1 = settings.tax1Inclusive 
        ? lastTransaction.items.reduce((sum, item) => sum + (item.totalPrice - (item.totalPrice / (1 + settings.tax1Rate / 100))), 0)
        : lastTransaction.subtotal * (settings.tax1Rate / 100);
      lines.push(`${settings.tax1Label}: ${Math.round(t1).toLocaleString()}`);
    }
    if (settings.tax2Enabled) {
      const t2 = lastTransaction.subtotal * (settings.tax2Rate / 100);
      lines.push(`${settings.tax2Label}: ${Math.round(t2).toLocaleString()}`);
    }
    lines.push(`*Total: ${lastTransaction.total.toLocaleString()}*`);
    lines.push("");
    lines.push("*Payment:*");
    lastTransaction.payments.forEach((p) => {
      lines.push(`${p.method.replace("-", " ")}: ${p.amount.toLocaleString()}`);
    });
    if (lastTransaction.change && lastTransaction.change > 0) {
      lines.push(`Change: ${lastTransaction.change.toLocaleString()}`);
    }
    lines.push("");
    lines.push(settings.receiptFooter || "Thank you for your purchase!");

    const message = encodeURIComponent(lines.join("\n"));
    const waUrl = `https://wa.me/${fullNumber}?text=${message}`;
    window.open(waUrl, "_blank");
  };

  const handleConnectPrinter = async () => {
    setConnectingPrinter(true);
    try {
      const result = await bluetoothPrinter.connect();
      if (result.success) {
        setIsPrinterConnected(true);
        toast({
          title: "Printer connected",
          description: "Bluetooth printer connected successfully",
        });
      } else {
        toast({
          title: "Connection failed",
          description: result.error || "Could not connect to printer",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to connect printer:", error);
      toast({
        title: "Connection failed",
        description: "An error occurred while connecting",
        variant: "destructive",
      });
    } finally {
      setConnectingPrinter(false);
    }
  };

  // Tax calculations for payment entry view
  const tax1Amount = settings?.tax1Enabled ? 
    (settings.tax1Inclusive ? 
      cart.reduce((sum, item) => sum + (item.totalPrice - (item.totalPrice / (1 + settings.tax1Rate / 100))), 0) 
      : subtotal * (settings.tax1Rate / 100)) 
    : 0;
    
  const tax2Amount = settings?.tax2Enabled ? 
    (settings.tax1Inclusive ? 
      (subtotal * (settings.tax2Rate / 100))
      : subtotal * (settings.tax2Rate / 100))
    : 0;

  const allPaymentMethods: { method: PaymentMethod; label: string; icon: React.ElementType }[] = [
    { method: "cash", label: translate("payment.cash", language), icon: DollarSign },
    { method: "qris-static", label: translate("payment.qrisStatic", language), icon: QrCode },
    { method: "qris-dynamic", label: translate("payment.qrisDynamic", language), icon: QrCode },
    { method: "card", label: translate("payment.card", language), icon: CreditCard },
    { method: "voucher", label: translate("payment.voucher", language), icon: Ticket },
    { method: "transfer", label: translate("payment.transfer", language), icon: Wallet }
  ];

  const enabledPaymentMethods = allPaymentMethods.filter(m => {
    if (m.method === "qris-static") {
      return settings?.paymentMethods?.qrisStatic !== false;
    }
    if (m.method === "qris-dynamic") {
      return settings?.paymentMethods?.qrisDynamic === true;
    }
    const methodKey = m.method as keyof typeof settings.paymentMethods;
    return settings?.paymentMethods?.[methodKey] !== false;
  });

  // ============ COMPLETED STATE - Transaction Success Screen ============
  if (completed && lastTransaction && settings) {
    const receiptNumber = generateReceiptNumber(lastTransaction.timestamp);
    const receiptTimestamp = new Date(lastTransaction.timestamp);
    
    // Calculate tax from transaction data (not props)
    const displayTax1 = settings.tax1Enabled ? 
      (settings.tax1Inclusive ? 
        lastTransaction.items.reduce((sum, item) => sum + (item.totalPrice - (item.totalPrice / (1 + settings.tax1Rate / 100))), 0)
        : lastTransaction.subtotal * (settings.tax1Rate / 100)) 
      : 0;
    const displayTax2 = settings.tax2Enabled ? 
      (lastTransaction.subtotal * (settings.tax2Rate / 100))
      : 0;
    
    return (
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <DialogTitle className="text-xl">Transaction Successful!</DialogTitle>
            
            {/* Receipt Preview Container - overflow hidden for animation */}
            <div className="w-full overflow-hidden relative" style={{ minHeight: printAnimating ? "20px" : "auto" }}>
              {/* Digital Receipt Preview - matches printed receipt exactly */}
              <div 
                ref={receiptRef}
                className={`w-full bg-white text-black p-4 text-xs font-mono border border-gray-200 shadow-sm transition-all duration-700 ease-in-out ${
                  printAnimating 
                    ? "-translate-y-[120%] opacity-0 scale-95" 
                    : "translate-y-0 opacity-100 scale-100"
                }`}
              >
                {/* Header */}
                <div className="text-center mb-2 space-y-0.5">
                  {settings.receiptLogoBase64 && (
                    <img src={settings.receiptLogoBase64} alt="Logo" className="h-10 mx-auto mb-2 grayscale" />
                  )}
                  <div className="font-bold text-sm">{settings.businessName}</div>
                  {settings.businessAddress && (
                    <div className="whitespace-pre-line text-[10px] text-gray-600">{settings.businessAddress}</div>
                  )}
                  {settings.taxId && (
                    <div className="text-[10px] text-gray-500">{settings.taxId}</div>
                  )}
                </div>
                
                {/* Receipt Info Line */}
                <div className="flex justify-between text-[10px] text-gray-500 border-b border-dashed border-gray-300 pb-2 mb-2">
                  <span className="font-medium">{receiptNumber}</span>
                  <span>
                    {receiptTimestamp.toLocaleDateString(language === "id" ? "id-ID" : "en-US", { day: "numeric", month: "numeric", year: "numeric" })}, {receiptTimestamp.toLocaleTimeString(language === "id" ? "id-ID" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                
                {/* Cashier */}
                <div className="text-[10px] text-gray-600 mb-2">
                  Cashier: {lastTransaction.cashierName}
                </div>

                {/* Items */}
                <div className="border-t border-dashed border-gray-300 py-2 space-y-1.5">
                  {lastTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="font-medium text-[11px]">{item.name}</div>
                      <div className="flex justify-between text-[10px] text-gray-700">
                        <span>{item.quantity} x {item.basePrice.toLocaleString()}</span>
                        <span>{item.totalPrice.toLocaleString()}</span>
                      </div>
                      {(item.variant || (item.modifiers && item.modifiers.length > 0)) && (
                        <div className="text-[9px] text-gray-500 pl-2">
                          {item.variant && <div>• {item.variant}</div>}
                          {item.modifiers?.map(m => <div key={m}>+ {m}</div>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span>Subtotal</span>
                    <span>{lastTransaction.subtotal.toLocaleString()}</span>
                  </div>
                  {settings.tax1Enabled && (
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>{settings.tax1Label} ({settings.tax1Rate}%)</span>
                      <span>{Math.round(displayTax1).toLocaleString()}</span>
                    </div>
                  )}
                  {settings.tax2Enabled && (
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>{settings.tax2Label} ({settings.tax2Rate}%)</span>
                      <span>{Math.round(displayTax2).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {/* TOTAL - Double height simulation with larger font */}
                  <div className="flex justify-between font-black text-base border-t border-gray-400 border-b-2 border-double pt-2 pb-2 mt-2 mb-1">
                    <span className="text-lg">TOTAL</span>
                    <span className="text-lg">{lastTransaction.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment & Change */}
                <div className="pt-2 space-y-1">
                  {lastTransaction.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="capitalize">{p.method.replace("-", " ")}</span>
                      <span>{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {lastTransaction.change && lastTransaction.change > 0 && (
                    <div className="flex justify-between font-bold text-[12px] border-t border-gray-300 pt-1 mt-1">
                      <span>Change</span>
                      <span>{lastTransaction.change.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="text-center text-[10px] whitespace-pre-line mt-4 pt-2 border-t border-dashed border-gray-300 text-gray-600">
                  {settings.receiptFooter || "Thank you for your purchase!"}
                </div>
                
                {settings.tax1Inclusive && settings.tax1Enabled && (
                  <div className="text-center text-[9px] italic mt-1 text-gray-400">
                    Prices inclusive of {settings.tax1Label} {settings.tax1Rate}%
                  </div>
                )}
              </div>
              
              {/* Print animation indicator */}
              {printAnimating && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs text-gray-400 animate-pulse">Sending to printer...</div>
                </div>
              )}
            </div>

            {/* Print Buttons */}
            <div className="flex flex-col gap-2 w-full pt-2">
              
              {/* Connect + Print Row */}
              <div className="flex gap-2 w-full">
                {!isPrinterConnected && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50" 
                    onClick={handleConnectPrinter}
                    disabled={connectingPrinter}
                  >
                    {connectingPrinter ? (
                      <Bluetooth className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Bluetooth className="h-4 w-4" />
                    )}
                    <span className="ml-1 text-xs">Connect</span>
                  </Button>
                )}
                
                <Button 
                  size="sm"
                  className={`flex-1 ${isPrinterConnected 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200"
                  }`} 
                  onClick={handlePrintBluetooth}
                  disabled={printing || !isPrinterConnected || printAnimating}
                >
                  {printing ? (
                    <>
                      <Printer className="h-4 w-4 animate-pulse" />
                      <span className="ml-1 text-xs">Printing...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      <span className="ml-1 text-xs">Print</span>
                    </>
                  )}
                </Button>
              </div>
              
              {/* Browser Print */}
              <Button 
                variant="outline" 
                size="sm"
                className="w-full border-gray-300 hover:bg-gray-100" 
                onClick={handlePrint}
                disabled={printAnimating}
              >
                <Printer className="h-4 w-4 mr-1" />
                <span className="text-xs">Browser Print</span>
              </Button>
              
              {/* WhatsApp Share */}
              <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">+62</span>
                  <Input
                    type="tel"
                    placeholder="8123456789"
                    value={whatsAppNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setWhatsAppNumber(value);
                    }}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
                <Button 
                  size="sm"
                  onClick={handleShareWhatsApp}
                  disabled={!whatsAppNumber}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white border-none px-4 h-9"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  <span className="text-xs font-medium">WhatsApp</span>
                </Button>
              </div>
              
              <Button 
                size="sm"
                className="w-full mt-1 bg-green-600 hover:bg-green-700" 
                onClick={handleNewSale}
              >
                New Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ============ PAYMENT ENTRY VIEW ============
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{translate("payment.title", language)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Amount Display */}
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>{translate("payment.subtotal", language)}</span>
                <span className="font-bold">Rp {subtotal.toLocaleString()}</span>
              </div>
              
              {settings?.tax1Enabled && (
                <div className="flex justify-between text-sm">
                  <span>{settings.tax1Label} {settings.tax1Rate}%</span>
                  <span className="font-bold">Rp {tax1Amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              
              {settings?.tax2Enabled && (
                <div className="flex justify-between text-sm">
                  <span>{settings.tax2Label} {settings.tax2Rate}%</span>
                  <span className="font-bold">Rp {tax2Amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              )}

              {settings?.tax1Inclusive && settings.tax1Enabled && (
                <div className="flex items-start gap-1 text-xs text-slate-600 dark:text-slate-400 italic">
                  <span>ⓘ</span>
                  <span>Prices inclusive of {settings.tax1Label} {settings.tax1Rate}%</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold border-t border-slate-300 dark:border-slate-600 pt-2">
                <span>{translate("payment.amount", language)}</span>
                <span>Rp {total.toLocaleString()}</span>
              </div>
              
              {payments.length > 0 && (
                <>
                  <div className="border-t border-slate-300 dark:border-slate-600 pt-2 mt-2">
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-1">
                      {translate("payment.paid", language)}
                    </div>
                    {payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-green-600 dark:text-green-400 pl-2">
                        <span className="capitalize">{p.method.replace("-", " ")}</span>
                        <span className="font-semibold">Rp {p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-300 dark:border-slate-600 pt-2">
                    <span>{translate("payment.remaining", language)}</span>
                    <span className="font-bold">Rp {remaining.toLocaleString()}</span>
                  </div>
                  {change > 0 && (
                    <div className="flex justify-between text-lg text-blue-600 dark:text-blue-400 pt-2 border-t">
                      <span>{translate("payment.change", language)}</span>
                      <span className="font-bold">Rp {change.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-2 gap-2">
              {enabledPaymentMethods.map(({ method, label, icon: Icon }) => (
                <Button
                  key={method}
                  variant={selectedMethod === method ? "default" : "outline"}
                  onClick={() => setSelectedMethod(method)}
                  className="h-auto py-3 flex flex-col items-center gap-2"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount ? parseFloat(amount).toLocaleString() : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  if (value === "" || !isNaN(parseFloat(value))) {
                    setAmount(value);
                  }
                }}
                onFocus={() => {
                  setAmount("");
                }}
                className="text-3xl text-center font-bold h-16"
              />
              
              <Button onClick={initiatePayment} className="w-full" disabled={!amount}>
                {translate("payment.add", language)}
              </Button>
            </div>

            {/* Payment Records */}
            {payments.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-auto">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded">
                    <span className="capitalize">{p.method.replace("-", " ")}</span>
                    <span className="font-semibold">Rp {p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                {translate("payment.cancel", language)}
              </Button>
              <Button
                onClick={completeSale}
                disabled={remaining > 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {remaining > 0 ? `${translate("payment.remaining", language)}: Rp ${remaining.toLocaleString()}` : translate("payment.complete", language)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QRIS Static Modal */}
      <Dialog open={showQrisStaticModal} onOpenChange={setShowQrisStaticModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QRIS</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            {settings?.qrisStaticImage ? (
              <img 
                src={settings.qrisStaticImage} 
                alt="Static QRIS" 
                className="w-64 h-64 object-contain border rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 flex items-center justify-center rounded-lg border-2 border-dashed">
                <span className="text-slate-500 text-center px-4">
                  No QR Code Configured.<br/>Please set in Settings.
                </span>
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-bold">Rp {parseFloat(amount || "0").toLocaleString()}</p>
              <p className="text-sm text-slate-500">Show this QR code to customer</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrisStaticModal(false)}>Cancel</Button>
            <Button onClick={confirmStaticQris}>Confirm Payment Received</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QRIS Dynamic Modal */}
      <Dialog open={showQrisDynamicModal} onOpenChange={(open) => !qrisLoading && setShowQrisDynamicModal(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dynamic QRIS</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4 min-h-[300px] justify-center">
            {qrisLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p>Generating QR Code...</p>
              </div>
            ) : dynamicQrUrl ? (
              <>
                <img 
                  src={dynamicQrUrl} 
                  alt="Dynamic QRIS" 
                  className="w-64 h-64 object-contain border rounded-lg"
                />
                <div className="text-center animate-pulse">
                  <p className="text-lg font-bold">Rp {parseFloat(amount || "0").toLocaleString()}</p>
                  <p className="text-sm text-blue-600 font-medium">Waiting for payment...</p>
                </div>
              </>
            ) : (
              <div className="text-red-500">Failed to generate QR Code</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrisDynamicModal(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}