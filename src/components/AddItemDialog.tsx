import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Item, Language } from "@/types";
import { AlertCircle, ArrowUpDown, Check, Loader2, ScanBarcode } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  initialSku: string;
  onItemCreated: (item: Item) => void;
  language: Language;
  categories: string[];
}

export function AddItemDialog({
  open,
  onClose,
  initialSku,
  onItemCreated,
  language,
  categories: initialCategories,
}: AddItemDialogProps) {
  const [item, setItem] = useState<Partial<Item>>({
    name: "",
    sku: "",
    price: 0,
    category: "General",
    variants: [],
    modifiers: [],
    isActive: true,
  });
  const [priceDisplay, setPriceDisplay] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [scannerOpen, setScannerOpen] = useState(false);

  const priceInputRef = useRef<HTMLInputElement>(null);

  // Initialize with SKU when dialog opens
  useEffect(() => {
    if (open) {
      setItem({
        name: "",
        sku: initialSku || "",
        price: 0,
        category: "General",
        variants: [],
        modifiers: [],
        isActive: true,
      });
      setPriceDisplay("");
      setValidationError("");
      
      // Lookup product name if SKU provided
      if (initialSku) {
        lookupProductBySKU(initialSku);
      }
      
      // Load categories
      loadCategories();
      
      // Auto-focus price field after a delay
      setTimeout(() => {
        priceInputRef.current?.focus();
      }, 100);
    }
  }, [open, initialSku]);

  const loadCategories = async () => {
    try {
      const allItems = await db.getAll<Item>("items");
      const uniqueCategories = [...new Set(allItems.map(i => i.category).filter(Boolean))];
      setCategories(uniqueCategories.length > 0 ? uniqueCategories : initialCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };

  const formatPrice = (value: number | string): string => {
    const numValue = typeof value === "string" ? value.replace(/[^\d]/g, "") : value.toString();
    if (!numValue || numValue === "0") return "";
    return parseInt(numValue).toLocaleString("id-ID");
  };

  const parsePrice = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, "");
    return parseInt(cleaned) || 0;
  };

  const handlePriceChange = (value: string) => {
    const formatted = formatPrice(value);
    setPriceDisplay(formatted);
    const numericValue = parsePrice(value);
    setItem((prev) => ({ ...prev, price: numericValue }));
  };

  const lookupProductBySKU = async (sku: string) => {
    if (!sku) return;

    try {
      const response = await fetch(`/api/lookup-product?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();

      if (data.success && data.productName) {
        setItem((prev) => {
          if (!prev) return prev;
          // Don't overwrite if user has already entered a name
          if (prev.name && prev.name.trim() !== "") return prev;

          return {
            ...prev,
            name: data.productName,
          };
        });
      }
    } catch (error) {
      // Silent failure - offline, not found, or API error
      console.debug("Product lookup failed (expected behavior):", error);
    }
  };

  const validateUniqueness = async (itemToValidate: Partial<Item>): Promise<string | null> => {
    const allItems = await db.getAll<Item>("items");

    if (itemToValidate.sku) {
      const duplicateSku = allItems.find(
        (i) => i.sku?.toLowerCase() === itemToValidate.sku?.toLowerCase()
      );
      if (duplicateSku) {
        return `SKU "${itemToValidate.sku}" already exists`;
      }
    }

    const duplicateName = allItems.find(
      (i) => i.name.toLowerCase() === itemToValidate.name?.toLowerCase()
    );
    if (duplicateName) {
      return `Item name "${itemToValidate.name}" already exists`;
    }

    return null;
  };

  const handleSave = async () => {
    if (!item.name?.trim()) {
      setValidationError("Item name is required");
      return;
    }

    if (!item.price || item.price <= 0) {
      setValidationError("Selling price must be greater than 0");
      return;
    }

    setIsSaving(true);
    try {
      const uniqueError = await validateUniqueness(item);
      if (uniqueError) {
        setValidationError(uniqueError);
        return;
      }

      const newItem: Item = {
        id: Date.now(),
        name: item.name.trim(),
        sku: item.sku?.trim() || "",
        price: item.price,
        category: item.category || "General",
        variants: [],
        modifiers: [],
        isActive: true,
      };

      await db.add("items", newItem);
      onItemCreated(newItem);
    } catch (error) {
      console.error("Error saving item:", error);
      setValidationError("Failed to save item");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategorySelect = (category: string) => {
    const capitalized = capitalizeWords(category);
    setItem((prev) => ({ ...prev, category: capitalized }));
    setCategorySheetOpen(false);
    setCategorySearch("");
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScannerOpen(false);
    setItem((prev) => ({ ...prev, sku: barcode }));
    await lookupProductBySKU(barcode);
  };

  const handleClose = () => {
    // Simply return to POS
    onClose();
  };

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        }
      }}>
        <DialogContent className="max-w-md h-[100dvh] max-h-[100dvh] flex flex-col p-0 gap-0 [&>button]:hidden">
          {/* Fixed Header */}
          <div className="flex-shrink-0 px-6 py-3 border-b bg-background">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-blue-600 hover:text-blue-700 hover:bg-transparent -ml-3"
              >
                {translate("common.cancel", language)}
              </Button>
              <h2 className="text-lg font-semibold">{translate("items.addItem", language)}</h2>
              <Button
                onClick={handleSave}
                disabled={!item.name || !item.price || item.price <= 0 || isSaving}
                className="bg-blue-600 hover:bg-blue-700 -mr-3"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {translate("common.save", language)}
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-6 py-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="space-y-4 pb-8">
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {/* SKU Field */}
              <div className="space-y-2">
                <Label>{translate("items.skuLabel", language)}</Label>
                <div className="flex gap-2">
                  <Input
                    value={item.sku || ""}
                    onChange={(e) => setItem((prev) => ({ ...prev, sku: e.target.value }))}
                    onBlur={async (e) => {
                      const sku = e.target.value?.trim();
                      if (sku && (!item.name || item.name === "")) {
                        await lookupProductBySKU(sku);
                      }
                    }}
                    placeholder="COFFEE-001"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setScannerOpen(true)}
                    className="shrink-0"
                  >
                    <ScanBarcode className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              </div>

              {/* Item Name Field */}
              <div className="space-y-2">
                <Label>
                  {translate("items.itemName", language)} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={item.name || ""}
                  onChange={(e) =>
                    setItem((prev) => ({ ...prev, name: capitalizeWords(e.target.value) }))
                  }
                  placeholder="Coffee Latte"
                  required
                />
              </div>

              {/* Selling Price Field */}
              <div className="space-y-2">
                <Label>
                  {translate("items.sellingPrice", language)} <span className="text-red-500">*</span>
                </Label>
                <Input
                  ref={priceInputRef}
                  type="text"
                  inputMode="numeric"
                  value={priceDisplay}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="25,000"
                  className="placeholder:text-slate-400/60"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{translate("items.category", language)}</Label>
                <Dialog open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setCategorySheetOpen(true)}
                  >
                    {item.category || translate("items.selectCategory", language)}
                    <ArrowUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                  <DialogContent className="max-w-md max-h-[50vh] flex flex-col p-0">
                    <div className="px-6 pt-6 pb-4 flex-shrink-0">
                      <h3 className="text-lg font-semibold">
                        {translate("items.selectCategory", language)}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 pb-2">
                      <Command className="rounded-lg border">
                        <CommandInput
                          placeholder={translate("common.search", language)}
                          value={categorySearch}
                          onValueChange={setCategorySearch}
                          className="placeholder:text-slate-400/60"
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-6 text-center text-sm text-slate-500">
                              {translate("items.noCategoryFound", language)}
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredCategories.map((cat) => (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={() => handleCategorySelect(cat)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.category === cat ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cat}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                    {categorySearch && filteredCategories.length === 0 && (
                      <div className="flex-shrink-0 p-6 pt-4 border-t bg-background">
                        <Button
                          onClick={() => handleCategorySelect(categorySearch)}
                          className="w-full"
                          size="lg"
                        >
                          {translate("items.createCategory", language)} "{capitalizeWords(categorySearch)}"
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <p className="text-xs text-slate-500/60">
                  {translate("items.tapSelectCategory", language)}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      {scannerOpen && (
        <BarcodeScanner
          isOpen={true}
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
          language={language}
        />
      )}
    </>
  );
}