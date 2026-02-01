import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentMethod, PaymentRecord, Transaction, DailyItemSales, DailyPaymentSales, Settings } from "@/types";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { CheckCircle2, DollarSign, QrCode, Ticket, Printer, Bluetooth } from "lucide-react";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";

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
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [qrisRef, setQrisRef] = useState("");
  const [completed, setCompleted] = useState(false);
  const [change, setChange] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

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
    }
  }, [open]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  
  // Calculate change whenever totalPaid updates
  useEffect(() => {
    setChange(Math.max(0, totalPaid - total));
  }, [totalPaid, total]);

  // Auto-fill amount with remaining balance
  useEffect(() => {
    if (remaining > 0) {
      setAmount(remaining.toString());
    }
  }, [remaining]);

  const addPayment = () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;

    const newPayment: PaymentRecord = {
      method: selectedMethod,
      amount: paymentAmount,
      ...(selectedMethod.includes("qris") && qrisRef ? { qrisRef } : {})
    };

    setPayments([...payments, newPayment]);
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
      // 1. Add to hot transactions
      await db.add("transactions", transaction);

      // 2. Update Daily Item Sales
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

      // 3. Update Daily Payment Sales
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
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Failed to save transaction. Please try again or contact support.");
    }
  };

  const handlePrintBluetooth = async () => {
    if (!lastTransaction || !settings || !currentUser) return;

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
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    onClose();
  };

  // Tax calculations for display
  const tax1Amount = settings?.tax1Enabled ? 
    (settings.tax1Inclusive ? 
      cart.reduce((sum, item) => sum + (item.totalPrice - (item.totalPrice / (1 + settings.tax1Rate / 100))), 0) 
      : subtotal * (settings.tax1Rate / 100)) 
    : 0;
    
  const tax2Amount = settings?.tax2Enabled ? 
    (settings.tax1Inclusive ? 
      (subtotal * (settings.tax2Rate / 100)) // Base on net subtotal
      : subtotal * (settings.tax2Rate / 100))
    : 0;

  const paymentMethods: { method: PaymentMethod; label: string; icon: any }[] = [
    { method: "cash", label: translate("payment.cash", language), icon: DollarSign },
    { method: "qris-static", label: translate("payment.qrisStatic", language), icon: QrCode },
    { method: "qris-dynamic", label: translate("payment.qrisDynamic", language), icon: QrCode },
    { method: "voucher", label: translate("payment.voucher", language), icon: Ticket }
  ];

  const isBluetoothConnected = bluetoothPrinter.isConnected();

  if (completed) {
    return (
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <DialogTitle className="text-xl">Transaction Successful!</DialogTitle>
            
            {/* Digital Receipt Preview */}
            <div className="w-full bg-white text-black p-4 text-xs font-mono border border-gray-200 shadow-sm my-4">
              {/* Header */}
              <div className="text-center mb-4 space-y-1">
                {settings?.businessLogo && (
                  <img src={settings.businessLogo} alt="Logo" className="h-12 mx-auto mb-2 grayscale" />
                )}
                <div className="font-bold text-base">{settings?.businessName}</div>
                {settings?.businessAddress && (
                  <div className="whitespace-pre-line">{settings.businessAddress}</div>
                )}
                {settings?.taxId && (
                  <div>{settings.taxId}</div>
                )}
                <div className="mt-2 text-[10px] text-gray-500">
                  {new Date().toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-b border-dashed border-gray-300 py-2 my-2 space-y-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div>{item.name}</div>
                    <div className="flex justify-between">
                      <span>{item.quantity} x {item.basePrice.toLocaleString()}</span>
                      <span>{item.totalPrice.toLocaleString()}</span>
                    </div>
                    {(item.variant || (item.modifiers && item.modifiers.length > 0)) && (
                      <div className="text-[10px] text-gray-500 pl-2">
                        {item.variant && <div>• {item.variant}</div>}
                        {item.modifiers?.map(m => <div key={m}>+ {m}</div>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString()}</span>
                </div>
                {settings?.tax1Enabled && (
                  <div className="flex justify-between text-gray-600">
                    <span>{settings.tax1Label} ({settings.tax1Rate}%)</span>
                    <span>{tax1Amount.toLocaleString()}</span>
                  </div>
                )}
                {settings?.tax2Enabled && (
                  <div className="flex justify-between text-gray-600">
                    <span>{settings.tax2Label} ({settings.tax2Rate}%)</span>
                    <span>{tax2Amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 mt-1">
                  <span>TOTAL</span>
                  <span>{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment & Change */}
              <div className="border-t border-gray-300 pt-2 mb-4 space-y-1">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="capitalize">{p.method.replace("-", " ")}</span>
                    <span>{p.amount.toLocaleString()}</span>
                  </div>
                ))}
                {change > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Change</span>
                    <span>{change.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="text-center text-[10px] whitespace-pre-line mt-4">
                {settings?.receiptFooter || "Thank you for your purchase!"}
              </div>
              
              {settings?.tax1Inclusive && (
                <div className="text-center text-[10px] italic mt-2 text-gray-400">
                  Prices inclusive of {settings.tax1Label} {settings.tax1Rate}%
                </div>
              )}
            </div>

            {/* Print Buttons */}
            <div className="flex flex-col gap-2 w-full">
              {isBluetoothConnected && (
                <Button 
                  variant="default" 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={handlePrintBluetooth}
                  disabled={printing}
                >
                  {printing ? (
                    <>
                      <Printer className="mr-2 h-4 w-4 animate-pulse" />
                      Printing...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="mr-2 h-4 w-4" />
                      Print via Bluetooth
                    </>
                  )}
                </Button>
              )}
              
              <Button variant="outline" className="w-full" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Browser Print
              </Button>
              
              <Button className="w-full" onClick={handleNewSale}>
                New Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Payment Entry View
  return (
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
            {paymentMethods.map(({ method, label, icon: Icon }) => (
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
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-xl text-center"
            />
            {selectedMethod.includes("qris") && (
              <Input
                type="text"
                placeholder="QRIS Reference (optional)"
                value={qrisRef}
                onChange={(e) => setQrisRef(e.target.value)}
                className="text-sm"
              />
            )}
            <Button onClick={addPayment} className="w-full" disabled={!amount}>
              Add Payment
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
              {remaining > 0 ? `Remaining: Rp ${remaining.toLocaleString()}` : translate("payment.complete", language)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}