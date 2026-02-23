import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { ReportsDialog } from "@/components/ReportsDialog";
import { CartItemEditDialog } from "@/components/CartItemEditDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Item, CartItem, Settings, Language, Shift } from "@/types";
import { Search, ShoppingCart, Trash2, Lock, LogOut, Settings as SettingsIcon, Clock, X, Plus, Minus, FileText, Volume2, ScanBarcode, HelpCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, playSuccessSound } from "@/lib/utils";
import Image from "next/image";
import { getSubscriptionInfo, getSubscriptionBarPercentage, getSubscriptionBarColor } from "@/lib/subscription-service";

interface POSScreenProps {
  onAdminClick: () => void;
  onAttendanceClick: () => void;
  onLockScreen: () => void;
}

export function POSScreen({ onAdminClick, onAttendanceClick, onLockScreen }: POSScreenProps) {
  const { currentUser, logout, cart, setCart, addToCart, removeFromCart, clearCart, cartTotal, pauseSession, lockSession, mode, language, settings } = useApp();
  const { theme, setTheme } = useTheme();
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
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(getSubscriptionInfo());
  
  // Item not found flow states
  const [itemNotFoundOpen, setItemNotFoundOpen] = useState(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState("");
  const [pinVerifyOpen, setPinVerifyOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [newItemData, setNewItemData] = useState({ name: "", price: 0, sku: "" });
  const [newItemPriceDisplay, setNewItemPriceDisplay] = useState("");
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  
  const { toast } = useToast();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const newItemPriceRef = useRef<HTMLInputElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const router = useRouter();

  // Load subscription info
  useEffect(() => {
    const info = getSubscriptionInfo();
    setSubscriptionInfo(info);
  }, []);

  // Calculate subscription bar values
  const subscriptionBarPercentage = getSubscriptionBarPercentage();
  const subscriptionBarColor = getSubscriptionBarColor(subscriptionInfo.status);

  // Screen Wake Lock - Always enabled for POS use
  useEffect(() => {
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err) {
          // Silent fail - not all browsers support wake lock
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Apply theme from settings when settings load or change
  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [settings?.theme, setTheme, theme]);

  useEffect(() => {
    loadItems();
    loadCurrentShift();
  }, []);

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
    setIsLoading(true);
    try {
      const allItems = await db.getItems();
      setItems(allItems.filter(item => item.isActive !== false));
    } catch (error) {
      console.error("Error loading items:", error);
      toast({
        title: translate("common.error", language),
        description: translate("pos.loadItemsError", language),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
        // Return true to indicate item was found - scanner will handle cooldown
      } else {
        // Item not found - close scanner and show dialog
        setScannerOpen(false);
        setNotFoundBarcode(barcode);
        setItemNotFoundOpen(true);
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

  // Handle "No" on item not found dialog
  const handleItemNotFoundNo = () => {
    setItemNotFoundOpen(false);
    setNotFoundBarcode("");
    // Reopen scanner after brief delay
    setTimeout(() => {
      setScannerOpen(true);
    }, 500);
  };

  // Handle "Yes" on item not found dialog - start PIN verification
  const handleItemNotFoundYes = () => {
    setItemNotFoundOpen(false);
    setPinInput("");
    setPinError("");
    setPinVerifyOpen(true);
  };

  // Verify cashier PIN
  const handlePinVerify = async () => {
    if (!currentUser?.pin) {
      setPinError(translate("pos.noPinSet", language));
      return;
    }
    
    if (pinInput === currentUser.pin) {
      // Blur current input to dismiss keyboard
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      
      setPinVerifyOpen(false);
      setPinInput("");
      setPinError("");
      
      // Small delay to let keyboard dismiss, then open modal
      setTimeout(() => {
        // Open create item dialog with SKU pre-filled
        setNewItemData({ name: "", price: 0, sku: notFoundBarcode });
        setNewItemPriceDisplay("");
        setCreateItemOpen(true);
        
        // Try to lookup product name
        lookupProductName(notFoundBarcode);
      }, 300);
    } else {
      // Don't close modal - just show error
      setPinError(translate("pos.incorrectPin", language));
      setPinInput("");
    }
  };

  // Lookup product name from external API
  const lookupProductName = async (sku: string) => {
    try {
      const response = await fetch(`/api/lookup-product?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();
      if (data.success && data.productName) {
        setNewItemData(prev => ({ ...prev, name: data.productName }));
      }
    } catch (error) {
      // Silent failure - user can enter name manually
    }
  };

  // Format price for display
  const formatPriceInput = (value: string): string => {
    const numValue = value.replace(/[^\d]/g, "");
    if (!numValue || numValue === "0") return "";
    return parseInt(numValue).toLocaleString("id-ID");
  };

  // Handle new item price change
  const handleNewItemPriceChange = (value: string) => {
    const formatted = formatPriceInput(value);
    setNewItemPriceDisplay(formatted);
    const numericValue = parseInt(value.replace(/[^\d]/g, "")) || 0;
    setNewItemData(prev => ({ ...prev, price: numericValue }));
  };

  // Capitalize words helper
  const capitalizeWords = (str: string) => {
    return str.split(" ").map(word => 
      word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  // Save new item and add to cart
  const handleSaveNewItem = async () => {
    if (!newItemData.name.trim() || newItemData.price <= 0) {
      toast({
        title: translate("common.error", language),
        description: translate("items.validationError", language),
        variant: "destructive",
      });
      return;
    }

    setIsCreatingItem(true);
    try {
      const newItem: Item = {
        id: Date.now(),
        sku: newItemData.sku,
        name: capitalizeWords(newItemData.name),
        price: newItemData.price,
        category: "General",
        variants: [],
        modifiers: [],
        isActive: true
      };

      await db.add("items", newItem);
      
      // Refresh items list
      const allItems = await db.getItems();
      setItems(allItems.filter(item => item.isActive !== false));

      // Add to cart
      const cartItem: CartItem = {
        itemId: newItem.id!,
        sku: newItem.sku || `ITEM-${newItem.id}`,
        name: newItem.name,
        quantity: 1,
        basePrice: newItem.price,
        totalPrice: newItem.price,
        variant: undefined,
        modifiers: []
      };
      setCart([...cart, cartItem]);

      toast({
        title: translate("items.itemCreated", language),
        description: newItem.name,
      });

      setCreateItemOpen(false);
      setNewItemData({ name: "", price: 0, sku: "" });
      setNotFoundBarcode("");

      // Reopen scanner after brief delay
      setTimeout(() => {
        setScannerOpen(true);
      }, 500);

    } catch (error) {
      console.error("Error creating item:", error);
      toast({
        title: translate("common.error", language),
        description: translate("items.createError", language),
        variant: "destructive",
      });
    } finally {
      setIsCreatingItem(false);
    }
  };

  // Cancel create item
  const handleCancelCreateItem = () => {
    setCreateItemOpen(false);
    setNewItemData({ name: "", price: 0, sku: "" });
    setNotFoundBarcode("");
    // Reopen scanner after brief delay
    setTimeout(() => {
      setScannerOpen(true);
    }, 500);
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

  const filteredItems = items
    .filter(item => {
      if (!searchQuery.trim()) return false;
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      const query = searchQuery.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aSku = a.sku?.toLowerCase() || "";
      const bSku = b.sku?.toLowerCase() || "";
      
      // Priority 1: Exact match (full name)
      const aExact = aName === query;
      const bExact = bName === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Priority 2: Starts with query
      const aStarts = aName.startsWith(query);
      const bStarts = bName.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Priority 3: Word boundary match (any word starts with query)
      const aWordBoundary = aName.split(' ').some(word => word.startsWith(query));
      const bWordBoundary = bName.split(' ').some(word => word.startsWith(query));
      if (aWordBoundary && !bWordBoundary) return -1;
      if (!aWordBoundary && bWordBoundary) return 1;
      
      // Priority 4: Contains query in name
      const aContains = aName.includes(query);
      const bContains = bName.includes(query);
      if (aContains && !bContains) return -1;
      if (!aContains && bContains) return 1;
      
      // Priority 5: SKU match (lowest priority)
      const aSkuMatch = aSku.includes(query);
      const bSkuMatch = bSku.includes(query);
      if (aSkuMatch && !bSkuMatch) return -1;
      if (!aSkuMatch && bSkuMatch) return 1;
      
      // Final: Alphabetical by name
      return aName.localeCompare(bName);
    });

  // Focus price input when create item dialog opens
  useEffect(() => {
    if (createItemOpen && newItemPriceRef.current) {
      // Delay to ensure modal is fully rendered and keyboard is dismissed
      const timer = setTimeout(() => {
        newItemPriceRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [createItemOpen]);

  // Automatically show dropdown when user types
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setShowItemPicker(true);
    } else {
      setShowItemPicker(false);
    }
  }, [searchQuery]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Fixed Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-1">
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
        
        {/* Subscription Progress Bar */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{ 
              width: `${subscriptionBarPercentage}%`,
              backgroundColor: subscriptionBarColor
            }}
          />
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={translate("pos.searchPlaceholder", language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowItemPicker(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScannerOpen(true)}
            className="h-10 w-10 flex-shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title={translate("scanner.title", language)}
          >
            <ScanBarcode className="h-5 w-5" />
          </Button>
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
              <p className="text-slate-400 dark:text-slate-500 text-xs">
                {translate("pos.searchHint", language)}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <HelpCircle className="h-3 w-3" />
                {translate("pos.tapToEditHint", language)}
              </p>
              {[...cart].reverse().map((item, idx) => {
                const actualIndex = cart.length - 1 - idx;
                return (
                <div
                  key={actualIndex}
                  onTouchStart={(e) => handleLongPressStart(item, actualIndex, e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchMove={(e) => handleLongPressMove(e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchEnd={handleLongPressEnd}
                  onMouseDown={(e) => handleLongPressStart(item, actualIndex, e.clientX, e.clientY)}
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
                );
              })}
            </div>
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

      {/* Item Not Found Dialog */}
      <AlertDialog open={itemNotFoundOpen} onOpenChange={setItemNotFoundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("pos.itemNotFound", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono text-base bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                {notFoundBarcode}
              </span>
              <br /><br />
              {translate("pos.createNewItem", language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleItemNotFoundNo}>
              {translate("common.no", language)}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleItemNotFoundYes} className="bg-blue-600 hover:bg-blue-700">
              {translate("common.yes", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Verification Dialog */}
      <AlertDialog open={pinVerifyOpen} onOpenChange={(open) => {
        if (!open) {
          setPinVerifyOpen(false);
          setPinInput("");
          setPinError("");
          setTimeout(() => setScannerOpen(true), 500);
        }
      }}>
        <AlertDialogContent className="pb-36">
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("pos.enterPin", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("pos.enterPinToCreateItem", language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && pinInput.length > 0) {
                  e.preventDefault();
                  handlePinVerify();
                }
              }}
              placeholder="••••••"
              className="text-center text-2xl tracking-widest"
              autoComplete="off"
              autoFocus
            />
            {pinError && (
              <p className="text-red-500 text-sm mt-2 text-center">{pinError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPinVerifyOpen(false);
              setPinInput("");
              setPinError("");
              setTimeout(() => setScannerOpen(true), 500);
            }}>
              {translate("common.cancel", language)}
            </AlertDialogCancel>
            <Button onClick={handlePinVerify} className="bg-blue-600 hover:bg-blue-700">
              {translate("common.verify", language)}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Item Dialog */}
      <Dialog open={createItemOpen} onOpenChange={(open) => {
        if (!open) handleCancelCreateItem();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("items.addItem", language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* SKU - Read Only */}
            <div className="space-y-2">
              <Label>{translate("items.skuLabel", language)}</Label>
              <Input
                value={newItemData.sku}
                readOnly
                className="bg-slate-100 dark:bg-slate-800 font-mono"
              />
            </div>

            {/* Item Name */}
            <div className="space-y-2">
              <Label>
                {translate("items.itemName", language)} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newItemData.name}
                onChange={(e) => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={translate("items.itemNamePlaceholder", language)}
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label>
                {translate("items.sellingPrice", language)} <span className="text-red-500">*</span>
              </Label>
              <Input
                ref={newItemPriceRef}
                type="text"
                inputMode="numeric"
                value={newItemPriceDisplay}
                onChange={(e) => handleNewItemPriceChange(e.target.value)}
                placeholder="25,000"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancelCreateItem} className="flex-1">
              {translate("common.cancel", language)}
            </Button>
            <Button 
              onClick={handleSaveNewItem} 
              disabled={!newItemData.name.trim() || newItemData.price <= 0 || isCreatingItem}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingItem ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {translate("common.save", language)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}