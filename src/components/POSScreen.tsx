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
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Item, CartItem, Settings, Language, Shift } from "@/types";
import { Search, ShoppingCart, Trash2, Lock, LogOut, Settings as SettingsIcon, Clock, X, Plus, Minus, FileText, Volume2, ScanBarcode } from "lucide-react";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, playSuccessSound } from "@/lib/utils";

interface POSScreenProps {
  onAdminClick: () => void;
  onAttendanceClick: () => void;
  onLockScreen: () => void;
}

export function POSScreen({ onAdminClick, onAttendanceClick, onLockScreen }: POSScreenProps) {
  const { currentUser, logout, cart, setCart, addToCart, removeFromCart, clearCart, cartTotal, pauseSession, lockSession, mode, language } = useApp();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: CartItem; index: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutBlockReason, setLogoutBlockReason] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { toast } = useToast();

  const searchInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    loadItems();
    loadSettings();
    loadCurrentShift();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await db.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadCurrentShift = async () => {
    try {
      if (!currentUser?.id) return;
      
      const today = new Date().toISOString().split("T")[0];
      const shifts = await db.searchByIndex<Shift>("shifts", "businessDate", today);
      const activeShift = shifts.find(s => s.cashierId === currentUser.id && s.status === "active");
      
      setCurrentShift(activeShift || null);
    } catch (error) {
      console.error("Error loading current shift:", error);
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

  const handleBarcodeScan = async (barcode: string) => {
    try {
      // Find item by SKU
      const item = items.find(i => i.sku === barcode);
      
      if (item) {
        // Check if item already exists in cart
        const existingItemIndex = cart.findIndex(
          cartItem => cartItem.itemId === item.id && 
          !cartItem.variant &&
          (!cartItem.modifiers || cartItem.modifiers.length === 0)
        );

        if (existingItemIndex !== -1) {
          // Item exists - increment quantity
          const updatedCart = [...cart];
          const existingItem = updatedCart[existingItemIndex];
          updatedCart[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + 1,
            totalPrice: existingItem.basePrice * (existingItem.quantity + 1)
          };
          setCart(updatedCart);
        } else {
          // New item - add to cart
          const newItem: CartItem = {
            itemId: item.id,
            sku: item.sku || `ITEM-${item.id}`,
            name: item.name,
            quantity: 1,
            basePrice: item.price,
            totalPrice: item.price,
            variant: undefined,
            modifiers: []
          };
          setCart([...cart, newItem]);
        }
        
        // Sound is handled by BarcodeScanner for immediate feedback
      } else {
        // Item not found
        toast({
          title: translate("pos.itemNotFound", language),
          description: `SKU: ${barcode}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Barcode scan error:", error);
      toast({
        title: translate("pos.error", language),
        description: translate("pos.itemNotFound", language),
        variant: "destructive",
      });
    }
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

  const handlePauseSession = () => {
    setShowPauseConfirm(true);
  };

  const handleConfirmPause = async () => {
    await pauseSession();
    await logout();
    setShowPauseConfirm(false);
  };

  const handleLockScreen = async () => {
    console.log("Lock screen clicked, locking session...");
    await lockSession();
    onLockScreen(); // Notify parent to switch screen state if needed
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => playSuccessSound()}
              className="h-8 w-8"
              title={translate("pos.testSound", language)}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAttendanceClick}
            className="flex items-center gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{translate("pos.attendance", language)}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLockScreen}
            className="flex items-center gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{translate("pos.lockScreen", language)}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{translate("pos.logout", language)}</span>
          </Button>
        </div>
      </div>

      {/* Fixed Search Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
          <Input
            type="text"
            placeholder={translate("pos.searchPlaceholder", language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={scannerOpen}
            className="flex-1"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowItemPicker(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScannerOpen(true)}
              className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title={translate("scanner.title", language)}
            >
              <ScanBarcode className="h-5 w-5" />
            </Button>
          </div>
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
        shift={currentShift}
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

      {/* Barcode Scanner */}
      {scannerOpen && (
        <BarcodeScanner
          isOpen={true}
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
          language={language}
        />
      )}

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

      {/* Pause Session Confirmation */}
      <AlertDialog open={showPauseConfirm} onOpenChange={setShowPauseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("pos.confirmPause", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("pos.confirmPauseMessage", language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPauseConfirm(false)}>
              {translate("common.cancel", language)}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPause}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {translate("pos.pauseSession", language)}
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