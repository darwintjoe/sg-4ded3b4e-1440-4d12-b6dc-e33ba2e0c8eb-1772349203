import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentMethod, PaymentRecord, Transaction, DailyItemSales, DailyPaymentSales } from "@/types";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { CheckCircle2, DollarSign, QrCode, Ticket } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  tax: number;
}

export function PaymentDialog({ open, onClose, total, subtotal, tax }: PaymentDialogProps) {
  const { language, cart, clearCart, currentUser, mode, currentShift } = useApp();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [qrisRef, setQrisRef] = useState("");

  // Reset payment state when dialog closes
  useEffect(() => {
    if (!open) {
      setPayments([]);
      setAmount("");
      setQrisRef("");
      setSelectedMethod("cash");
    }
  }, [open]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

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
    if (remaining > 0 || !currentUser || !currentShift) return;

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

      // 2. Update Daily Item Sales (sequential to avoid transaction conflicts)
      for (const item of cart) {
        const dailyItem: DailyItemSales = {
          itemId: item.itemId,
          sku: item.sku,
          itemName: item.name,
          businessDate: currentShift.businessDate,
          totalQuantity: item.quantity,
          totalRevenue: item.totalPrice,
          transactionCount: 1
        };
        await db.upsert("dailyItemSales", ["businessDate", "itemId"], dailyItem);
      }

      // 3. Update Daily Payment Sales (sequential to avoid transaction conflicts)
      for (const p of payments) {
        const dailyPayment: DailyPaymentSales = {
          method: p.method,
          businessDate: currentShift.businessDate,
          totalAmount: p.amount,
          transactionCount: 1
        };
        await db.upsert("dailyPaymentSales", ["businessDate", "method"], dailyPayment);
      }

      // Only clear cart after successful save
      clearCart();
      setPayments([]);
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Failed to save transaction. Please try again or contact support.");
      // Don't clear cart - allow user to retry
    }
  };

  const paymentMethods: { method: PaymentMethod; label: string; icon: any }[] = [
    { method: "cash", label: translate("payment.cash", language), icon: DollarSign },
    { method: "qris-static", label: translate("payment.qrisStatic", language), icon: QrCode },
    { method: "qris-dynamic", label: translate("payment.qrisDynamic", language), icon: QrCode },
    { method: "voucher", label: translate("payment.voucher", language), icon: Ticket }
  ];

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
              <span>{translate("payment.amount", language)}</span>
              <span className="font-bold">Rp {total.toLocaleString()}</span>
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