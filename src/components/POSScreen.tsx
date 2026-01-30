import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/PaymentDialog";
import { ReportsDialog } from "@/components/ReportsDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Item, CartItem } from "@/types";
import { Search, ShoppingCart, Trash2, PauseCircle, LogOut, Settings, Clock, Package, X } from "lucide-react";

interface POSScreenProps {
  onAdminClick: () => void;
  onAttendanceClick: () => void;
}

export function POSScreen({ onAdminClick, onAttendanceClick }: POSScreenProps) {
  const { currentUser, logout, cart, addToCart, removeFromCart, clearCart, cartTotal, pauseSession, mode, language } = useApp();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);

  const TAX_RATE = 0.11;
  const subtotal = cartTotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const allItems = await db.getAll<Item>("items");
      setItems(allItems.filter(item => item.isActive !== false));
    } catch (error) {
      console.error("Error loading items:", error);
    }
  };

  const handlePayment = () => {
    if (cart.length === 0) return;
    setPaymentOpen(true);
  };

  const handleItemClick = (item: Item) => {
    if (!item.id) return;

    const cartItem: CartItem = {
      itemId: item.id,
      sku: item.sku || `ITEM-${item.id}`,
      name: item.name,
      quantity: 1,
      basePrice: item.price,
      totalPrice: item.price,
      variant: item.variants && item.variants.length > 0 ? item.variants[0].name : undefined,
      modifiers: []
    };

    addToCart(cartItem);
    setShowItemPicker(false);
    setSearchQuery("");
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      (item.sku && item.sku.toLowerCase().includes(query))
    );
  });

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Fixed Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onAdminClick} className="h-9 w-9 p-0">
              <Settings className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-black tracking-tight">SELL MORE</h1>
            <Badge variant="outline" className="text-xs">
              {translate(`pos.mode.${mode}`, language)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
          </div>
        </div>
        
        {/* Action Buttons Row */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAttendanceClick}
            className="flex-1 h-10"
          >
            <Clock className="h-4 w-4 mr-2" />
            {translate("attendance.title", language)}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={pauseSession}
            className="flex-1 h-10"
          >
            <PauseCircle className="h-4 w-4 mr-2" />
            {translate("pos.pause", language)}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="flex-1 h-10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {translate("pos.logout", language)}
          </Button>
        </div>
      </div>

      {/* Fixed Search Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
          <Input
            placeholder={translate("pos.search", language)}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowItemPicker(e.target.value.length > 0);
            }}
            onFocus={() => {
              if (searchQuery.length > 0) setShowItemPicker(true);
            }}
            className="pl-10 h-12 text-base"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowItemPicker(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Item Picker Dropdown */}
        {showItemPicker && (
          <div className="absolute left-3 right-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-2 max-h-64 overflow-y-auto z-50">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                {searchQuery.trim() === "" ? translate("pos.search", language) : "No items found"}
              </div>
            ) : (
              <div className="py-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      {item.sku && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.sku}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <p className="text-base font-bold text-blue-600">
                        Rp {item.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Cart Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h2 className="font-bold text-base">{translate("pos.cart", language)}</h2>
              <Badge variant="secondary" className="text-xs">{cart.length}</Badge>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="h-8">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <ShoppingCart className="h-16 w-16 text-slate-300" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {translate("pos.empty", language)}
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-1 group relative"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromCart(idx)}
                  className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3 text-red-600" />
                </Button>
                <div className="flex justify-between pr-8">
                  <span className="font-semibold text-sm">{item.name}</span>
                  <span className="font-bold text-sm">Rp {item.totalPrice.toLocaleString("id-ID")}</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {item.quantity}x @ Rp {item.basePrice.toLocaleString("id-ID")}
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
      </div>

      {/* Fixed Bottom Footer */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-3 py-3 flex-shrink-0 shadow-lg">
        <div className="space-y-2 text-sm mb-3">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">{translate("pos.subtotal", language)}</span>
            <span className="font-semibold">Rp {subtotal.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">{translate("pos.tax", language)} (11%)</span>
            <span className="font-semibold">Rp {tax.toLocaleString("id-ID")}</span>
          </div>
        </div>
        
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-lg mb-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{translate("pos.total", language)}</span>
            <span className="text-2xl font-black">Rp {total.toLocaleString("id-ID")}</span>
          </div>
        </div>
        
        <Button
          onClick={handlePayment}
          disabled={cart.length === 0}
          className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
        >
          {translate("pos.payment", language)}
        </Button>
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