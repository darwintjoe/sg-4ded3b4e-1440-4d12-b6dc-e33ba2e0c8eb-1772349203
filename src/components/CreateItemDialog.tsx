import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { db } from "@/lib/db";
import { Item } from "@/types";
import { AlertCircle, ArrowUpDown, Check, Loader2, ScanBarcode } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { translate } from "@/lib/translations";

interface CreateItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialSku?: string;
  language: string;
  onItemCreated?: (item: Item) => void;
}

export function CreateItemDialog({ 
  isOpen, 
  onClose, 
  initialSku = "", 
  language,
  onItemCreated 
}: CreateItemDialogProps) {
  const [editingItem, setEditingItem] = useState<Partial<Item>>({
    name: "",
    sku: initialSku,
    price: 0,
    category: "General",
    variants: [],
    modifiers: [],
    isActive: true
  });
  const [priceDisplay, setPriceDisplay] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map(word => {
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

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const allItems = await db.getAll<Item>("items");
      const uniqueCategories = Array.from(new Set(allItems.map(item => item.category).filter(Boolean)));
      setCategories(uniqueCategories);
    };
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Reset form when dialog opens with new SKU
  useEffect(() => {
    if (isOpen) {
      setEditingItem({
        name: "",
        sku: initialSku,
        price: 0,
        category: "General",
        variants: [],
        modifiers: [],
        isActive: true
      });
      setPriceDisplay("");
      setValidationError("");
      
      // Lookup product name if SKU provided
      if (initialSku) {
        lookupProductBySKU(initialSku);
      }
    }
  }, [isOpen, initialSku]);

  const lookupProductBySKU = async (sku: string) => {
    if (!sku) return;

    try {
      const response = await fetch(`/api/lookup-product?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();

      if (data.success && data.productName) {
        setEditingItem(prev => {
          if (!prev) return prev;
          if (prev.name && prev.name.trim() !== "") return prev;
          return { ...prev, name: data.productName };
        });
      }
    } catch (error) {
      console.debug("Product lookup failed (expected behavior):", error);
    }
  };

  const validateUniqueness = async (item: Partial<Item>): Promise<string | null> => {
    const allItems = await db.getAll<Item>("items");
    
    if (item.sku) {
      const duplicateSku = allItems.find(
        (i) => i.sku?.toLowerCase() === item.sku?.toLowerCase() && i.id !== item.id
      );
      if (duplicateSku) {
        return `SKU "${item.sku}" already exists`;
      }
    }

    if (item.name) {
      const duplicateName = allItems.find(
        (i) => i.name.toLowerCase() === item.name!.toLowerCase() && i.id !== item.id
      );
      if (duplicateName) {
        return `Item name "${item.name}" already exists`;
      }
    }

    return null;
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    
    setIsSaving(true);
    try {
      if (!editingItem.name?.trim()) {
        setValidationError("Item name is required");
        return;
      }

      if (!editingItem.price || editingItem.price <= 0) {
        setValidationError("Selling price must be greater than 0");
        return;
      }

      const uniqueError = await validateUniqueness(editingItem);
      if (uniqueError) {
        setValidationError(uniqueError);
        return;
      }

      const itemToSave: Item = {
        id: Date.now(),
        name: editingItem.name,
        sku: editingItem.sku || "",
        price: editingItem.price,
        category: editingItem.category || "General",
        variants: [],
        modifiers: [],
        isActive: true
      };

      await db.add("items", itemToSave);
      
      setValidationError("");
      onItemCreated?.(itemToSave);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePriceChange = (value: string) => {
    const formatted = formatPrice(value);
    setPriceDisplay(formatted);
    const numericValue = parsePrice(value);
    setEditingItem(prev => ({ ...prev, price: numericValue }));
  };

  const handleCategorySelect = (category: string) => {
    const capitalized = capitalizeWords(category);
    setEditingItem(prev => ({ ...prev, category: capitalized }));
    setCategorySheetOpen(false);
    setCategorySearch("");
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScannerOpen(false);
    setEditingItem(prev => ({ ...prev, sku: barcode }));
    await lookupProductBySKU(barcode);
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md h-[100dvh] max-h-[100dvh] flex flex-col p-0 gap-0 [&>button]:hidden">
          {/* Fixed Header */}
          <div className="flex-shrink-0 px-6 py-3 border-b bg-background">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="text-blue-600 hover:text-blue-700 hover:bg-transparent -ml-3"
              >
                {translate("common.cancel", language)}
              </Button>
              <h2 className="text-lg font-semibold">
                {translate("items.addItem", language)}
              </h2>
              <Button 
                onClick={handleSaveItem}
                disabled={!editingItem.name || !editingItem.price || editingItem.price <= 0 || isSaving}
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
                    value={editingItem.sku || ""}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, sku: e.target.value }))}
                    onBlur={async (e) => {
                      const sku = e.target.value?.trim();
                      if (sku && (!editingItem.name || editingItem.name === "")) {
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
                  value={editingItem.name || ""}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, name: capitalizeWords(e.target.value) }))}
                  placeholder="Coffee Latte"
                  required
                />
              </div>

              {/* Price Field */}
              <div className="space-y-2">
                <Label>{translate("items.sellingPrice", language)} <span className="text-red-500">*</span></Label>
                <Input
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
                    {editingItem.category || translate("items.selectCategory", language)}
                    <ArrowUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                  <DialogContent className="max-w-md max-h-[50vh] flex flex-col p-0">
                    <div className="px-6 pt-6 pb-4 flex-shrink-0">
                      <h3 className="text-lg font-semibold">{translate("items.selectCategory", language)}</h3>
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
                                    editingItem.category === cat ? "opacity-100" : "opacity-0"
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