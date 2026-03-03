import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { TransactionHistoryScreen } from "@/components/TransactionHistoryScreen";
import { PaymentDialog } from "@/components/PaymentDialog";
import { ReportsDialog } from "@/components/ReportsDialog";
import { CartItemEditDialog } from "@/components/CartItemEditDialog";
import { AddItemDialog } from "@/components/AddItemDialog";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Item, CartItem, Settings, Language, Shift, Employee } from "@/types";
import { Search, ShoppingCart, Trash2, Lock, LogOut, Settings as SettingsIcon, Clock, X, Plus, Minus, FileText, Volume2, ScanBarcode, HelpCircle, Loader2, Database } from "lucide-react";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, playSuccessSound, playTiitSound, roundTo50 } from "@/lib/utils";
import Image from "next/image";
import { getSubscriptionInfo, getSubscriptionBarPercentage, getSubscriptionBarColor } from "@/lib/subscription-service";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";

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
  
  // Printer connection state
  const [printerConnected, setPrinterConnected] = useState(false);
  const [autoReconnectAttempted, setAutoReconnectAttempted] = useState(false);
  
  // Database size odometer
  const [dbSize, setDbSize] = useState<{ bytes: number; records: number } | null>(null);
  
  // Item not found flow states - SIMPLE: just track dialog open state and the scanned SKU
  const [itemNotFoundOpen, setItemNotFoundOpen] = useState(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState("");
  const [pinVerifyOpen, setPinVerifyOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  const { toast } = useToast();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const router = useRouter();

  // Load subscription info
  useEffect(() => {
    const info = getSubscriptionInfo();
    setSubscriptionInfo(info);
  }, []);

  // Load database size on mount
  useEffect(() => {
    const loadDbSize = async () => {
      try {
        const result = await db.estimateDatabaseSize();
        const totalRecords = Object.values(result.breakdown).reduce((sum, s) => sum + s.count, 0);
        setDbSize({ bytes: result.totalBytes, records: totalRecords });
      } catch (e) {
        console.error("Failed to estimate DB size:", e);
      }
    };
    loadDbSize();
  }, []);

  // Calculate subscription bar values
  const subscriptionBarPercentage = getSubscriptionBarPercentage();
  const subscriptionBarColor = getSubscriptionBarColor(subscriptionInfo.status);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
    loadCategories();
  }, []);

  // Bluetooth connection management
  useEffect(() => {
    // Set up connection callbacks
    bluetoothPrinter.setOnConnect((name) => {
      setPrinterConnected(true);
      toast({
        title: translate("pos.printerConnected", language),
        description: name,
      });
    });

    bluetoothPrinter.setOnDisconnect(() => {
      setPrinterConnected(false);
      toast({
        title: translate("pos.printerDisconnected", language),
        variant: "destructive",
      });
    });

    // Check initial connection status
    setPrinterConnected(bluetoothPrinter.isConnected());

    // Attempt auto-reconnect if not already connected
    if (!bluetoothPrinter.isConnected() && !autoReconnectAttempted) {
      setAutoReconnectAttempted(true);
      bluetoothPrinter.autoReconnect().then((result) => {
        if (result.success) {
          setPrinterConnected(true);
        }
      });
    }

    // Poll connection status periodically
    const interval = setInterval(() => {
      setPrinterConnected(bluetoothPrinter.isConnected());
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [language, autoReconnectAttempted, toast]);

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

  const loadCategories = async () => {
    try {
      const allItems = await db.getItems();
      const uniqueCategories = [...new Set(allItems.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  // Calculate subtotal and taxes based on dual tax system
  const itemsTotal = cartTotal;
  let subtotal = itemsTotal;
  let tax1Amount = 0;
  let tax2Amount = 0;

  if (settings) {
    // Step 1: Handle Tax1 (PPN)
    if (settings.tax1Enabled) {
      if (settings.tax1Inclusive) {
        // Tax1 is included in price - extract it
        subtotal = itemsTotal / (1 + settings.tax1Rate / 100);
        tax1Amount = itemsTotal - subtotal;
      } else {
        // Tax1 is exclusive - add it on top
        tax1Amount = itemsTotal * (settings.tax1Rate / 100);
      }
    }

    // Step 2: Calculate Tax2 (Service) on (subtotal + tax1Amount)
    // Tax2 is always exclusive and calculated on the amount after Tax1
    if (settings.tax2Enabled) {
      const tax2Base = subtotal + tax1Amount;
      tax2Amount = tax2Base * (settings.tax2Rate / 100);
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
      playTiitSound();
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
      playTiitSound();
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
          playTiitSound();
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
          playTiitSound();
        }
        
        // Sound is handled by BarcodeScanner for immediate feedback
      } else {
        // Item not found - close scanner, open AddItemDialog directly (skip Y/N dialog)
        setScannerOpen(false);
        setNotFoundBarcode(barcode);
        setAddItemDialogOpen(true);
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

  // Handle "No" on item not found dialog - simply return to POS
  const handleItemNotFoundNo = () => {
    setItemNotFoundOpen(false);
    // notFoundBarcode stays as-is, harmless if unused
  };

  // Handle "Yes" on item not found dialog - open AddItemDialog directly (skip PIN for testing)
  const handleItemNotFoundYes = () => {
    setItemNotFoundOpen(false);
    setScannerOpen(false);
    // Skip PIN, open AddItemDialog directly
    setAddItemDialogOpen(true);
  };

  // Verify active cashier PIN only
  const handlePinVerify = async () => {
    const pin = pinInput.trim();
    if (!pin) return;

    if (currentUser && currentUser.pin === pin) {
      // PIN verified - close PIN dialog and open Add Item dialog
      setPinVerifyOpen(false);
      setPinInput("");
      setPinError("");
      setAddItemDialogOpen(true);
    } else {
      setPinError(translate("pos.incorrectPin", language));
      setPinInput("");
    }
  };

  // Handle cancel on PIN dialog - simply return to POS
  const handlePinCancel = () => {
    setPinVerifyOpen(false);
    setPinInput("");
    setPinError("");
    // notFoundBarcode stays as-is, harmless if unused
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
    onLockScreen();
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
      const aWordBoundary = aName.split(" ").some(word => word.startsWith(query));
      const bWordBoundary = bName.split(" ").some(word => word.startsWith(query));
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

  // Automatically show dropdown when user types
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setShowItemPicker(true);
    } else {
      setShowItemPicker(false);
    }
  }, [searchQuery]);

  const [showHistory, setShowHistory] = useState(false);

  if (showHistory) {
    return <TransactionHistoryScreen onBack={() => setShowHistory(false)} />;
  }

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
            
            {/* Printer Connection LED Indicator */}
            <div
              className={`w-2.5 h-2.5 rounded-full ml-2 transition-all duration-300 ${printerConnected ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "bg-slate-300 dark:bg-slate-600"}`}
              title={printerConnected ? "Printer connected" : "Printer not connected"}
            />
            
            {/* Database Size Odometer */}
            {dbSize && (
              <div 
                className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono text-slate-600 dark:text-slate-300"
                title={`${dbSize.records.toLocaleString()} records`}
              >
                <Database className="h-3 w-3" />
                <span>{formatBytes(dbSize.bytes)}</span>
              </div>
            )}
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
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{translate("pos.history", language)}</span>
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
              <div className="p-4 text-center">
                {searchQuery.trim() === "" ? (
                  <span className="text-slate-500 dark:text-slate-400">{translate("pos.search", language)}</span>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-500 dark:text-slate-400">
                      {translate("pos.itemNotFound", language)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Use search query as the SKU to pass to AddItemDialog
                        setNotFoundBarcode(searchQuery.trim());
                        setShowItemPicker(false);
                        setSearchQuery("");
                        // Skip PIN, open AddItemDialog directly
                        setAddItemDialogOpen(true);
                      }}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      {translate("pos.createNewItem", language)} →
                    </Button>
                  </div>
                )}
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
                        {formatCurrency(item.price)}
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
                        <span>@ {formatCurrency(item.basePrice)}</span>
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
                      <p className="font-bold text-base">{formatCurrency(item.totalPrice)}</p>
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
            <span className="font-semibold text-right min-w-[120px]">{formatCurrency(subtotal)}</span>
          </div>
          {settings?.tax1Enabled && tax1Amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">
                {settings.tax1Label} {settings.tax1Rate}%
              </span>
              <span className="font-semibold text-right min-w-[120px]">{formatCurrency(tax1Amount)}</span>
            </div>
          )}
          {settings?.tax2Enabled && tax2Amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">
                {settings.tax2Label} {settings.tax2Rate}%
              </span>
              <span className="font-semibold text-right min-w-[120px]">{formatCurrency(tax2Amount)}</span>
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
            <span className="text-2xl font-black text-right">{formatCurrency(total)}</span>
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
      <AlertDialog open={itemNotFoundOpen} onOpenChange={() => {
        // Ignore onOpenChange - only close via explicit button clicks
        // This prevents timing issues when transitioning to AddItemDialog
      }}>
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
      <AlertDialog open={pinVerifyOpen} onOpenChange={setPinVerifyOpen}>
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
            <AlertDialogCancel onClick={handlePinCancel}>
              {translate("common.cancel", language)}
            </AlertDialogCancel>
            <Button onClick={handlePinVerify} className="bg-blue-600 hover:bg-blue-700">
              {translate("common.verify", language)}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addItemDialogOpen}
        onClose={() => {
          setAddItemDialogOpen(false);
        }}
        initialSku={notFoundBarcode}
        onItemCreated={(newItem) => {
          addToCart({
            itemId: newItem.id!,
            sku: newItem.sku || `ITEM-${newItem.id}`,
            name: newItem.name,
            quantity: 1,
            basePrice: newItem.price,
            totalPrice: newItem.price,
            modifiers: [],
          });
          setAddItemDialogOpen(false);
          loadItems();
          playTiitSound();
          toast({ title: translate("pos.itemAddedToCart", language) });
        }}
        language={language}
        categories={categories}
      />
    </div>
  );
}