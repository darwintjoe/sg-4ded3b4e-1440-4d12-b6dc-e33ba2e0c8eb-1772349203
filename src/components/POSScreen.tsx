import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogOut, Pause, ShoppingCart, Search, Trash2 } from "lucide-react";

export function POSScreen() {
  const { currentUser, logout, pauseSession, cart, cartTotal, removeFromCart, mode } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const handlePause = async () => {
    await pauseSession();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SELL MORE</h1>
          <Badge variant="outline" className="text-sm">
            {mode === "retail" ? "Retail Mode" : "Cafe/Restaurant Mode"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {currentUser?.name}
          </span>
          {currentUser?.role === "cashier" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Area */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search */}
          <div className="mb-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search by item name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>

          {/* Categories & Items */}
          <div className="flex-1 overflow-auto">
            <div className="text-center py-20 text-slate-500">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No items configured yet</p>
              <p className="text-sm mt-2">Admin can add items from the dashboard</p>
            </div>
          </div>
        </div>

        {/* Cart Area */}
        <div className="w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <Card key={index} className="p-3 border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{item.name}</h4>
                      {item.variant && (
                        <p className="text-xs text-slate-500">{item.variant}</p>
                      )}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-slate-500">
                          +{item.modifiers.join(", ")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      {item.quantity} × {formatCurrency(item.basePrice)}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Total */}
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-900 text-white p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">TOTAL</span>
              <span className="text-3xl font-bold">{formatCurrency(cartTotal)}</span>
            </div>
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
              disabled={cart.length === 0}
            >
              Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}