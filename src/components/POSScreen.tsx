import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { ReportsDialog } from "@/components/ReportsDialog";
import { CartItemEditDialog } from "@/components/CartItemEditDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Item, CartItem, Settings, Language } from "@/types";
import { Search, ShoppingCart, Trash2, PauseCircle, LogOut, Settings as SettingsIcon, Clock, X } from "lucide-react";

interface POSScreenProps {
  onAdminClick: () => void;
  onAttendanceClick: () => void;
}

export function POSScreen({ onAdminClick, onAttendanceClick }: POSScreenProps) {
  const { currentUser, logout, cart, setCart, addToCart, removeFromCart, clearCart, cartTotal, pauseSession, mode, language } = useApp();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: CartItem; index: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutBlockReason, setLogoutBlockReason] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await db.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadItems = async () => {
    try {
      const allItems = await db.getItems();
      setItems(allItems.filter(item => item.isActive !== false));
    } catch (error) {
      console.error("Error loading items:", error);
    }
  };

  // Calculate subtotal and taxes based on dual tax system
  const itemsTotal = cartTotal;
  let subtotal = itemsTotal;
  let tax1Amount = 0;
  let tax2Amount = 0;

  if (settings) {
    // Step 1: Extract Tax 1 if inclusive
    if (settings.tax1Enabled && settings.tax1Inclusive) {
      subtotal = itemsTotal / (1 + settings.tax1Rate / 100);
      tax1Amount = itemsTotal - subtotal;
    }

    // Step 2: Calculate Tax 1 if exclusive
    if (settings.tax1Enabled && !settings.tax1Inclusive) {
      tax1Amount = subtotal * (settings.tax1Rate / 100);
    }

    // Step 3: Calculate Tax 2 (always exclusive)
    if (settings.tax2Enabled) {
      tax2Amount = subtotal * (settings.tax2Rate / 100);
    }
  }

  const totalTax = tax1Amount + tax2Amount;
  // If Tax 1 is inclusive, itemsTotal already includes it. We add exclusive Tax 1 and Tax 2.
  // Wait, if Tax 1 is inclusive, itemsTotal = subtotal + tax1Amount.
  // If Tax 1 is exclusive, itemsTotal = subtotal.
  // Tax 2 is always calculated on subtotal.
  
  // Total logic:
  // Base = subtotal
  // + Tax 1 (if exclusive)
  // + Tax 1 (if inclusive, it's already in base? No, subtotal is net.)
  // Let's stick to the calculation:
  // Total = subtotal + tax1Amount + tax2Amount?
  // If inclusive: itemsTotal (110) = subtotal (100) + tax1 (10).
  // Total should be 110 + tax2 (5% of 100 = 5) = 115.
  // Formula: subtotal + tax1Amount + tax2Amount. 
  // 100 + 10 + 5 = 115. Correct.
  
  // What if exclusive?
  // ItemsTotal (100) = subtotal (100).
  // Tax 1 (10% of 100) = 10.
  // Tax 2 (5% of 100) = 5.
  // Total = 100 + 10 + 5 = 115. Correct.
  
  const total = subtotal + tax1Amount + tax2Amount;

  const handlePayment = () => {
    if (cart.length === 0) return;
    setPaymentOpen(true);
  };

  const handleItemClick = (item: Item) => {
    if (!item.id) return;

    // Check if item already exists in cart
    const existingIndex = cart.findIndex(
      cartItem => cartItem.itemId === item.id && !cartItem.variant && (!cartItem.modifiers || cartItem.modifiers.length === 0)
    );

    if (existingIndex !== -1) {
      // Item exists, increment quantity
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedCart[existingIndex].quantity + 1,
        totalPrice: updatedCart[existingIndex].basePrice * (updatedCart[existingIndex].quantity + 1)
      };
      setCart(updatedCart);
    } else {
      // New item, add to cart
      const cartItem: CartItem = {
        itemId: item.id,
        sku: item.sku || `ITEM-${item.id}`,
        name: item.name,
        quantity: 1,
        basePrice: item.price,
        totalPrice: item.price,
        variant: undefined,
        modifiers: []
      };
      addToCart(cartItem);
    }

    // Clear search text and refocus input to keep keyboard open
    setSearchQuery("");
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleLongPressStart = (item: CartItem, index: number, clientX: number, clientY: number) => {
    setTouchStartPos({ x: clientX, y: clientY });
    const timer = setTimeout(() => {
      setEditingItem({ item, index });
      setTouchStartPos(null);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressMove = (clientX: number, clientY: number) => {
    if (touchStartPos && longPressTimer) {
      const deltaX = Math.abs(clientX - touchStartPos.x);
      const deltaY = Math.abs(clientY - touchStartPos.y);
      // If finger moved more than 10px, cancel long press
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setTouchStartPos(null);
      }
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setTouchStartPos(null);
  };

  const handleSaveEdit = (updatedItem: CartItem) => {
    if (editingItem) {
      const updatedCart = [...cart];
      updatedCart[editingItem.index] = updatedItem;
      setCart(updatedCart);
      setEditingItem(null);
    }
  };

  const handleDeleteEdit = () => {
    if (editingItem) {
      removeFromCart(editingItem.index);
      setEditingItem(null);
    }
  };

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const handleLogoutClick = () => {
    if (cart.length > 0) {
      setLogoutBlockReason(translate("pos.cannotLogoutWithCart", language));
      setShowLogoutConfirm(true);
    } else {
      setLogoutBlockReason("");
      setShowLogoutConfirm(true);
    }
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
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
              <SettingsIcon className="h-5 w-5" />
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
            onClick={handleLogoutClick}
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
            ref={searchInputRef}
            placeholder={translate("pos.search", language)}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowItemPicker(e.target.value.trim().length > 0);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setShowItemPicker(true);
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
                      <p className="text-base font-bold text-blue-600 text-right">
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
              <Button variant="ghost" size="sm" onClick={handleClearCart} className="h-8">
                <Trash2 className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-xs">{translate("pos.clearAll", language)}</span>
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
                onTouchStart={(e) => handleLongPressStart(item, idx, e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleLongPressMove(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={(e) => handleLongPressStart(item, idx, e.clientX, e.clientY)}
                onMouseMove={(e) => handleLongPressMove(e.clientX, e.clientY)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-1 cursor-pointer active:bg-slate-50 dark:active:bg-slate-750 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {item.quantity}x
                      </Badge>
                      <span>@ Rp {item.basePrice.toLocaleString("id-ID")}</span>
                    </div>
                    {item.variant && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        {item.variant}
                      </div>
                    )}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        + {item.modifiers.join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right min-w-[100px]">
                    <p className="font-bold text-base">Rp {item.totalPrice.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fixed Bottom Footer */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-3 py-3 flex-shrink-0 shadow-lg">
        <div className="space-y-2 text-sm mb-3 px-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">{translate("pos.subtotal", language)}</span>
            <span className="font-semibold text-right min-w-[120px]">Rp {subtotal.toLocaleString("id-ID")}</span>
          </div>
          {settings?.tax1Enabled && tax1Amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">
                {settings.tax1Label} {settings.tax1Rate}%
              </span>
              <span className="font-semibold text-right min-w-[120px]">Rp {tax1Amount.toLocaleString("id-ID")}</span>
            </div>
          )}
          {settings?.tax2Enabled && tax2Amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">
                {settings.tax2Label} {settings.tax2Rate}%
              </span>
              <span className="font-semibold text-right min-w-[120px]">Rp {tax2Amount.toLocaleString("id-ID")}</span>
            </div>
          )}
          {settings?.tax1Enabled && settings?.tax1Inclusive && (
            <div className="flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400 italic">
              <span>ⓘ</span>
              <span>Prices inclusive of {settings.tax1Label} {settings.tax1Rate}%</span>
            </div>
          )}
        </div>
        
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-lg mb-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{translate("pos.total", language)}</span>
            <span className="text-2xl font-black text-right">Rp {total.toLocaleString("id-ID")}</span>
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
        tax={totalTax}
        settings={settings}
      />

      <ReportsDialog
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
      />

      <CartItemEditDialog
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
        item={editingItem?.item || null}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEdit}
        allowPriceOverride={settings?.allowPriceOverride || false}
        language={language}
      />

      {/* Clear Cart Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("pos.confirmClearCart", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("pos.confirmClearCartMessage", language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearConfirm(false)}>
              {translate("common.cancel", language)}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClear}
              className="bg-red-600 hover:bg-red-700"
            >
              {translate("pos.clearAll", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirmation */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {logoutBlockReason ? translate("pos.cannotLogout", language) : translate("pos.confirmLogout", language)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {logoutBlockReason || translate("pos.confirmLogoutMessage", language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {logoutBlockReason ? (
              <AlertDialogAction onClick={() => setShowLogoutConfirm(false)}>
                {translate("common.ok", language)}
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel onClick={() => setShowLogoutConfirm(false)}>
                  {translate("common.cancel", language)}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmLogout}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {translate("pos.endShift", language)}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}