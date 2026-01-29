import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/PaymentDialog";
import { ReportsDialog } from "@/components/ReportsDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { translate } from "@/lib/translations";
import { Search, ShoppingCart, Trash2, PauseCircle, LogOut, Settings, Clock } from "lucide-react";

interface POSScreenProps {
  onAdminClick: () => void;
  onAttendanceClick: () => void;
}

export function POSScreen({ onAdminClick, onAttendanceClick }: POSScreenProps) {
  const { currentUser, logout, cart, clearCart, cartTotal, pauseSession, mode, language } = useApp();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const TAX_RATE = 0.11;
  const subtotal = cartTotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handlePayment = () => {
    if (cart.length === 0) return;
    setPaymentOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* Admin & Attendance Icons (Top Left) */}
          <Button variant="ghost" size="sm" onClick={onAdminClick}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onAttendanceClick}>
            <Clock className="h-5 w-5" />
          </Button>
          
          <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
          
          <h1 className="text-2xl font-black tracking-tight">SELL MORE</h1>
          <Badge variant="outline" className="text-xs">
            {translate(`pos.mode.${mode}`, language)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <Button variant="ghost" size="sm" onClick={pauseSession}>
            <PauseCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-2">
            {currentUser?.name}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Items Area */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder={translate("pos.search", language)}
                className="pl-10 h-12 text-lg"
              />
            </div>

            {/* Items Grid - Placeholder */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-md mb-2"></div>
                  <p className="font-semibold text-sm">Item {i}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">SKU-00{i}</p>
                  <p className="text-lg font-bold mt-2">Rp {(i * 10000).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Area */}
        <div className="w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="font-bold text-lg">{translate("pos.cart", language)}</h2>
              <Badge variant="secondary">{cart.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={clearCart} disabled={cart.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                {translate("pos.empty", language)}
              </p>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-1"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="font-bold">Rp {item.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {item.quantity}x @ Rp {item.basePrice.toLocaleString()}
                  </div>
                  {item.variant && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Variant: {item.variant}
                    </div>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      + {item.modifiers.join(", ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{translate("pos.subtotal", language)}</span>
                <span>Rp {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{translate("pos.tax", language)} (11%)</span>
                <span>Rp {tax.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium">{translate("pos.total", language)}</span>
                <span className="text-3xl font-black">Rp {total.toLocaleString()}</span>
              </div>
            </div>
            <Button
              onClick={handlePayment}
              disabled={cart.length === 0}
              className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
            >
              {translate("pos.payment", language)}
            </Button>
          </div>
        </div>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        total={total}
        subtotal={subtotal}
        tax={tax}
      />

      <ReportsDialog
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
      />
    </div>
  );
}