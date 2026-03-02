import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/contexts/AppContext";
import { useLongPress } from "@/hooks/use-long-press";
import { db } from "@/lib/db";
import { Item } from "@/types";
import { Plus, Search, Upload, AlertCircle, ArrowUpDown, Trash2, Check, Download, Loader2, ScanBarcode, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { translate } from "@/lib/translations";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type SortField = "sku" | "name" | "price";
type SortDirection = "asc" | "desc" | null;
type StatusFilter = "all" | "active" | "inactive";

const ItemRow = ({ item, onEdit }: { item: Item; onEdit: (item: Item) => void }) => {
  const longPressHandlers = useLongPress({
    onLongPress: () => onEdit(item),
    onClick: () => {},
    delay: 500,
  });

  // Determine SKU font size based on length
  const skuLength = (item.sku || "").length;
  const skuFontClass = skuLength > 12 ? "text-xs" : "text-sm";

  return (
    <TableRow
      {...longPressHandlers}
      className={cn(
        "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none touch-manipulation",
        item.isActive === false && "opacity-50 bg-slate-100 dark:bg-slate-900"
      )}
    >
      <TableCell className={cn("w-[30%] min-w-[100px] truncate", skuFontClass)}>{item.sku || "-"}</TableCell>
      <TableCell className="text-sm w-[50%] min-w-[120px] break-words whitespace-normal">{item.name}</TableCell>
      <TableCell className="text-right text-sm w-[20%] min-w-[70px] whitespace-nowrap">
        {item.price.toLocaleString("id-ID")}
      </TableCell>
    </TableRow>
  );
};

export function ItemsPanel() {
  const { language, pendingNewItemSku, setPendingNewItemSku } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [originalItem, setOriginalItem] = useState<Item | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Import Progress State
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const capitalizeWords = (str: string) => {
    return str
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const formatPrice = (value: number | string): string => {
    const numValue = typeof value === 'string' ? value.replace(/[^\d]/g, '') : value.toString();
    if (!numValue || numValue === '0') return '';
    return parseInt(numValue).toLocaleString('id-ID');
  };

  const parsePrice = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const uniqueCategories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));
    setCategories(uniqueCategories);
  }, [items]);

  useEffect(() => {
    if (editingItem) {
      setPriceDisplay(formatPrice(editingItem.price));
    }
  }, [editingItem?.id]);

  // Check for pending SKU from POS barcode scan
  useEffect(() => {
    if (pendingNewItemSku) {
      const newItem = {
        name: "",
        sku: pendingNewItemSku,
        price: 0,
        category: "General",
        variants: [],
        modifiers: [],
        isActive: true
      };
      setEditingItem(newItem);
      setOriginalItem({ ...newItem });
      setPriceDisplay("");
      setHasUnsavedChanges(false);
      setValidationError("");
      setCanDelete(true);
      setIsDialogOpen(true);
      
      // Lookup product name
      lookupProductBySKU(pendingNewItemSku);
      
      // Clear the pending SKU
      setPendingNewItemSku(null);
    }
  }, [pendingNewItemSku]);

  const loadItems = async () => {
    const allItems = await db.getAll<Item>("items");
    setItems(allItems);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField("name");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const validateUniqueness = async (item: Item): Promise<string | null> => {
    const allItems = await db.getAll<Item>("items");
    
    if (item.sku) {
      const duplicateSku = allItems.find(
        (i) => i.sku?.toLowerCase() === item.sku?.toLowerCase() && i.id !== item.id
      );
      if (duplicateSku) {
        return `SKU "${item.sku}" already exists`;
      }
    }

    const duplicateName = allItems.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.id !== item.id
    );
    if (duplicateName) {
      return `Item name "${item.name}" already exists`;
    }

    return null;
  };

  const checkItemCanDelete = async (itemId: number): Promise<boolean> => {
    const transactions = await db.getAll("transactions");
    const usedInTransactions = transactions.some((txn: any) =>
      txn.items?.some((cartItem: any) => cartItem.itemId === itemId)
    );
    return !usedInTransactions;
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    
    setIsSaving(true);
    try {
      if (!editingItem.name.trim()) {
        setValidationError("Item name is required");
        return;
      }

      if (editingItem.price <= 0) {
        setValidationError("Selling price must be greater than 0");
        return;
      }

      const uniqueError = await validateUniqueness(editingItem);
      if (uniqueError) {
        setValidationError(uniqueError);
        return;
      }

      const itemToSave = {
        ...editingItem,
        isActive: editingItem.isActive ?? true
      };

      if (itemToSave.id) {
        await db.put("items", itemToSave);
      } else {
        await db.add("items", { ...itemToSave, id: Date.now() });
      }

      await loadItems();
      setHasUnsavedChanges(false);
      setValidationError("");
      setIsDialogOpen(false);
      setEditingItem(null);
      setOriginalItem(null);
      setPriceDisplay("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem?.id || !canDelete) return;

    if (confirm(`Permanently delete "${editingItem.name}"? This cannot be undone.`)) {
      await db.delete("items", editingItem.id);
      await loadItems();
      setIsDialogOpen(false);
      setEditingItem(null);
      setOriginalItem(null);
      setPriceDisplay("");
    }
  };

  const handleDeleteClick = () => {
    if (!canDelete) return;
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!editingItem?.id) return;
    
    await db.delete("items", editingItem.id);
    await loadItems();
    setDeleteDialogOpen(false);
    setIsDialogOpen(false);
    setEditingItem(null);
    setOriginalItem(null);
    setPriceDisplay("");
  };

  const handleNewItem = () => {
    const newItem = {
      name: "",
      sku: "",
      price: 0,
      category: "General",
      variants: [],
      modifiers: [],
      isActive: true
    };
    setEditingItem(newItem);
    setOriginalItem({ ...newItem });
    setPriceDisplay("");
    setHasUnsavedChanges(false);
    setValidationError("");
    setCanDelete(true);
    setIsDialogOpen(true);
  };

  const handleEditItem = async (item: Item) => {
    setEditingItem({ ...item });
    setOriginalItem({ ...item });
    setPriceDisplay(formatPrice(item.price));
    setHasUnsavedChanges(false);
    setValidationError("");
    
    if (item.id) {
      const deletable = await checkItemCanDelete(item.id);
      setCanDelete(deletable);
    } else {
      setCanDelete(true);
    }
    
    setIsDialogOpen(true);
  };

  const hasActualChanges = (): boolean => {
    if (!editingItem || !originalItem) return false;
    
    const normalize = (val: any) => {
      if (val === "" || val === null || val === undefined) return "";
      if (typeof val === "string") return val.trim();
      return val;
    };

    return (
      normalize(editingItem.name) !== normalize(originalItem.name) ||
      normalize(editingItem.sku) !== normalize(originalItem.sku) ||
      editingItem.price !== originalItem.price ||
      normalize(editingItem.category) !== normalize(originalItem.category) ||
      editingItem.isActive !== originalItem.isActive
    );
  };

  const handleCloseDialog = () => {
    if (hasActualChanges()) {
      if (confirm("You have unsaved changes. Discard them?")) {
        setIsDialogOpen(false);
        setEditingItem(null);
        setOriginalItem(null);
        setHasUnsavedChanges(false);
        setValidationError("");
        setPriceDisplay("");
      }
    } else {
      setIsDialogOpen(false);
      setEditingItem(null);
      setOriginalItem(null);
      setValidationError("");
      setPriceDisplay("");
    }
  };

  const handleFieldChange = (field: keyof Item, value: any) => {
    if (!editingItem) return;
    
    if (field === "name" && typeof value === "string") {
      value = capitalizeWords(value);
    }
    
    setEditingItem({ ...editingItem, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handlePriceChange = (value: string) => {
    const formatted = formatPrice(value);
    setPriceDisplay(formatted);
    const numericValue = parsePrice(value);
    handleFieldChange("price", numericValue);
  };

  const handleCategorySelect = (category: string) => {
    const capitalized = capitalizeWords(category);
    handleFieldChange("category", capitalized);
    setCategorySheetOpen(false);
    setCategorySearch("");
    
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      
      if (lines.length < 2) {
        alert("CSV file is empty or has no data rows");
        setImporting(false);
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

      const findColumn = (headers: string[], patterns: string[]): number => {
        return headers.findIndex(h => 
          patterns.some(p => h.includes(p.toLowerCase()))
        );
      };

      const columnMap = {
        sku: findColumn(headers, ["sku", "code", "barcode", "item code"]),
        name: findColumn(headers, ["name", "product", "item"]),
        price: findColumn(headers, ["price", "cost", "amount"]),
        category: findColumn(headers, ["category", "type", "group"])
      };

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      const totalRows = lines.length - 1;
      // Calculate delay: At least 1.5s total duration, or 50ms per item max
      // If very few items, sleep longer per item to make it visible
      const delayPerItem = Math.max(10, Math.min(100, 1500 / Math.max(1, totalRows)));

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(",").map(v => v.trim());
          
          const sku = columnMap.sku !== -1 ? values[columnMap.sku] : "";
          const name = columnMap.name !== -1 ? values[columnMap.name] : "";
          const priceStr = columnMap.price !== -1 ? values[columnMap.price] : "0";
          const category = columnMap.category !== -1 ? values[columnMap.category] : "";

          if (!name || name.length === 0) {
            errors.push(`Row ${i}: Missing product name`);
            skipped++;
            setImportProgress(Math.round((i / totalRows) * 100));
            await sleep(delayPerItem);
            continue;
          }

          const price = parseFloat(priceStr);
          if (isNaN(price) || price <= 0) {
            errors.push(`Row ${i}: Invalid price "${priceStr}"`);
            skipped++;
            setImportProgress(Math.round((i / totalRows) * 100));
            await sleep(delayPerItem);
            continue;
          }

          let finalCategory = category;
          if (!finalCategory && sku) {
            if (sku.startsWith("B")) finalCategory = "Beverages";
            else if (sku.startsWith("S")) finalCategory = "Snacks";
            else finalCategory = "General";
          } else if (!finalCategory) {
            finalCategory = "General";
          }

          const newItem: Item = {
            sku: sku || "",
            name: name,
            price: price,
            category: finalCategory,
            variants: [],
            modifiers: [],
            isActive: true
          };

          const uniqueError = await validateUniqueness(newItem);
          if (uniqueError) {
            errors.push(`Row ${i}: ${uniqueError}`);
            skipped++;
            setImportProgress(Math.round((i / totalRows) * 100));
            await sleep(delayPerItem);
            continue;
          }

          await db.add("items", { ...newItem, id: Date.now() + imported });
          imported++;
          
          setImportProgress(Math.round((i / totalRows) * 100));
          await sleep(delayPerItem);

        } catch (rowError: any) {
          errors.push(`Row ${i}: ${rowError.message}`);
          skipped++;
          setImportProgress(Math.round((i / totalRows) * 100));
          await sleep(delayPerItem);
        }
      }

      setImportProgress(100);
      await sleep(500); // Pause at 100% for satisfaction
      await loadItems();
      
      // Keep showing 100% for a moment before closing
      setImporting(false);

      let message = `Import complete!\nImported: ${imported}\nSkipped: ${skipped}`;
      if (errors.length > 0 && errors.length <= 10) {
        message += "\n\nErrors:\n" + errors.slice(0, 10).join("\n");
      } else if (errors.length > 10) {
        message += `\n\n${errors.length} errors occurred. Check console for details.`;
        console.error("Import errors:", errors);
      }

      alert(message);
      event.target.value = "";

    } catch (error: any) {
      console.error("CSV Import failed:", error);
      setImporting(false);
      alert(`Import failed: ${error.message}`);
      event.target.value = "";
    }
  };

  const handleCSVExport = async () => {
    const allItems = await db.getAll<Item>("items");
    const headers = ["SKU", "Name", "Price", "Category"];
    const rows = allItems.map(item => [item.sku || "", item.name, item.price, item.category]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "items.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lookupProductBySKU = async (sku: string) => {
    if (!sku) return;

    try {
      // Use our API route to bypass CORS
      const response = await fetch(`/api/lookup-product?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();

      if (data.success && data.productName) {
        setEditingItem(prev => {
          if (!prev) return null;
          // Don't overwrite if user has already entered a name
          if (prev.name && prev.name.trim() !== "") return prev;
          
          return {
            ...prev,
            name: data.productName
          };
        });
      }
    } catch (error) {
      // Silent failure - offline, not found, or API error
      console.debug('Product lookup failed (expected behavior):', error);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScannerOpen(false);
    
    if (!editingItem) return;
    
    // Set the scanned barcode as SKU
    setEditingItem(prev => {
      if (!prev) return null;
      return { ...prev, sku: barcode };
    });
    setHasUnsavedChanges(true);
    
    // Lookup product name
    await lookupProductBySKU(barcode);
  };

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = item.isActive !== false;
      if (statusFilter === "inactive") matchesStatus = item.isActive === false;
      
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      if (!sortDirection) return 0;

      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "sku") {
        aVal = (a.sku || "").toLowerCase();
        bVal = (b.sku || "").toLowerCase();
      } else if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "price") {
        aVal = a.price;
        bVal = b.price;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Importing Progress Overlay */}
      {importing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-8 max-w-md w-[90%] space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">Importing Items...</h3>
                <p className="text-sm text-slate-500">Processing your CSV file</p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={importProgress} className="h-3 w-full" />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Processing...</span>
                <span className="font-medium text-blue-600">{importProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Filters Section - Max 2 Rows */}
      <div className="flex-shrink-0 p-3 bg-background border-b space-y-2">
        {/* Row 1: Filters + Import/Export - Dynamic Width */}
        <div className="flex items-center gap-2 w-full">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="flex-1 min-w-0 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate("common.all", language)}</SelectItem>
              <SelectItem value="active">{translate("common.active", language)}</SelectItem>
              <SelectItem value="inactive">{translate("common.inactive", language)}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="flex-1 min-w-0 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate("common.all", language)}</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-w-0 text-sm"
          >
            {translate("common.import", language)}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCSVExport}
            className="flex-1 min-w-0 text-sm"
          >
            {translate("common.export", language)}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleCSVImport}
            className="hidden"
          />
        </div>

        {/* Row 2: Full-width Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
            <Input
              placeholder={translate("common.search", language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm w-full"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Card className="m-3 overflow-x-auto">
            <div className="min-w-[125%]">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[30%] min-w-[100px]">
                      <button
                        onClick={() => handleSort("sku")}
                        className="flex items-center gap-1 text-sm font-semibold hover:text-blue-600"
                      >
                        {translate("items.sku", language)}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[50%] min-w-[120px]">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 text-sm font-semibold hover:text-blue-600"
                      >
                        {translate("items.name", language)}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[20%] min-w-[70px] text-right">
                      <button
                        onClick={() => handleSort("price")}
                        className="flex items-center gap-1 text-sm font-semibold hover:text-blue-600 ml-auto"
                      >
                        {translate("items.price", language)}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-slate-500 text-sm">
                        {searchQuery ? translate("items.noResults", language) : translate("items.noItems", language)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <ItemRow key={item.id} item={item} onEdit={handleEditItem} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Floating Add Button */}
        <button
          onClick={handleNewItem}
          className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-20 transition-transform hover:scale-110"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCloseDialog();
        }
      }}>
        <DialogContent className="max-w-md h-[100dvh] max-h-[100dvh] flex flex-col p-0 gap-0 [&>button]:hidden">
          {editingItem && (
            <>
              {/* Fixed Header */}
              <div className="flex-shrink-0 px-6 py-3 border-b bg-background">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    onClick={handleCloseDialog}
                    className="text-blue-600 hover:text-blue-700 hover:bg-transparent -ml-3"
                  >
                    {translate("common.cancel", language)}
                  </Button>
                  <h2 className="text-lg font-semibold">
                    {editingItem?.id ? translate("items.editItem", language) : translate("items.addItem", language)}
                  </h2>
                  <Button 
                    onClick={handleSaveItem}
                    disabled={!editingItem || !editingItem.name || editingItem.price <= 0 || isSaving}
                    className="bg-blue-600 hover:bg-blue-700 -mr-3"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {translate("common.save", language)}
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div 
                className="flex-1 overflow-y-auto overscroll-contain px-6 py-4" 
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="space-y-4 pb-8">
                  {validationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}

                  {/* SKU Field - Now First */}
                  <div className="space-y-2">
                    <Label>{translate("items.skuLabel", language)}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editingItem?.sku || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem!, sku: e.target.value })
                        }
                        onBlur={async (e) => {
                          // Trigger lookup when user tabs away from SKU field
                          const sku = e.target.value?.trim();
                          if (sku && (!editingItem?.name || editingItem.name === "")) {
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

                  {/* Item Name Field - Now Second */}
                  <div className="space-y-2">
                    <Label>
                      {translate("items.itemName", language)} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={editingItem?.name || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem!, name: e.target.value })
                      }
                      placeholder="Coffee Latte"
                      required
                    />
                  </div>

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

                  {editingItem.id && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{translate("items.activeStatus", language)}</p>
                        <p className="text-xs text-slate-500/60">
                          {translate("items.activeHelp", language)}
                        </p>
                      </div>
                      <Switch
                        checked={editingItem.isActive !== false}
                        onCheckedChange={(checked) => handleFieldChange("isActive", checked)}
                      />
                    </div>
                  )}

                  {editingItem.id && canDelete && (
                    <div className="pt-4">
                      <Button
                        onClick={handleDeleteClick}
                        variant="destructive"
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {translate("items.deleteItem", language)}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{editingItem?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Barcode Scanner */}
      {scannerOpen && (
        <BarcodeScanner
          isOpen={true}
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
          language={language}
        />
      )}
    </div>
  );
}