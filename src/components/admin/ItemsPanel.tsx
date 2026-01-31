import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useApp } from "@/contexts/AppContext";
import { useLongPress } from "@/hooks/use-long-press";
import { db } from "@/lib/db";
import { Item } from "@/types";
import { Plus, Search, Upload, AlertCircle, ArrowUpDown, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "sku" | "name" | "price";
type SortDirection = "asc" | "desc" | null;
type StatusFilter = "all" | "active" | "inactive";

// Extracted component to safely use hooks
const ItemRow = ({ item, onEdit }: { item: Item; onEdit: (item: Item) => void }) => {
  const longPressHandlers = useLongPress({
    onLongPress: () => onEdit(item),
    onClick: () => {}, // Single click does nothing to prevent accidental edits
    delay: 500,
  });

  return (
    <TableRow
      {...longPressHandlers}
      className={cn(
        "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none touch-manipulation",
        item.isActive === false && "opacity-50 bg-slate-100 dark:bg-slate-900"
      )}
    >
      <TableCell className="font-mono text-sm">{item.sku || "-"}</TableCell>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
        {item.price.toLocaleString("id-ID")}
      </TableCell>
    </TableRow>
  );
};

export function ItemsPanel() {
  const { language } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  // Helper function to format price with thousand separator
  const formatPrice = (value: number | string): string => {
    const numValue = typeof value === 'string' ? value.replace(/[^\d]/g, '') : value.toString();
    if (!numValue || numValue === '0') return '';
    return parseInt(numValue).toLocaleString('id-ID');
  };

  // Helper function to parse formatted price to number
  const parsePrice = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    // Extract unique categories
    const uniqueCategories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));
    setCategories(uniqueCategories);
  }, [items]);

  useEffect(() => {
    // Update price display when editing item changes
    if (editingItem) {
      setPriceDisplay(formatPrice(editingItem.price));
    }
  }, [editingItem?.id]);

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
    setIsSheetOpen(false);
    setEditingItem(null);
    setPriceDisplay("");
  };

  const handleDeleteItem = async () => {
    if (!editingItem?.id || !canDelete) return;

    if (confirm(`Permanently delete "${editingItem.name}"? This cannot be undone.`)) {
      await db.delete("items", editingItem.id);
      await loadItems();
      setIsSheetOpen(false);
      setEditingItem(null);
      setPriceDisplay("");
    }
  };

  const handleNewItem = () => {
    setEditingItem({
      name: "",
      sku: "",
      price: 0,
      category: "General",
      variants: [],
      modifiers: [],
      isActive: true
    });
    setPriceDisplay("");
    setHasUnsavedChanges(false);
    setValidationError("");
    setCanDelete(true);
    setIsSheetOpen(true);
  };

  const handleEditItem = async (item: Item) => {
    setEditingItem({ ...item });
    setPriceDisplay(formatPrice(item.price));
    setHasUnsavedChanges(false);
    setValidationError("");
    
    // Check if item can be deleted
    if (item.id) {
      const deletable = await checkItemCanDelete(item.id);
      setCanDelete(deletable);
    } else {
      setCanDelete(true);
    }
    
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Discard them?")) {
        setIsSheetOpen(false);
        setEditingItem(null);
        setHasUnsavedChanges(false);
        setValidationError("");
        setPriceDisplay("");
      }
    } else {
      setIsSheetOpen(false);
      setEditingItem(null);
      setValidationError("");
      setPriceDisplay("");
    }
  };

  const handleFieldChange = (field: keyof Item, value: any) => {
    if (!editingItem) return;
    
    // Auto-capitalize name field
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
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      
      if (lines.length < 2) {
        alert("CSV file is empty or has no data rows");
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
            continue;
          }

          const price = parseFloat(priceStr);
          if (isNaN(price) || price <= 0) {
            errors.push(`Row ${i}: Invalid price "${priceStr}"`);
            skipped++;
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
            continue;
          }

          await db.add("items", { ...newItem, id: Date.now() + imported });
          imported++;

        } catch (rowError: any) {
          errors.push(`Row ${i}: ${rowError.message}`);
          skipped++;
        }
      }

      await loadItems();

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
      alert(`Import failed: ${error.message}`);
      event.target.value = "";
    }
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
    <div className="p-4 space-y-3">
      {/* Compact Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Expandable Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchExpanded(true)}
            onBlur={() => setSearchExpanded(false)}
            className={cn(
              "transition-all duration-200 pl-10",
              searchExpanded ? "w-full sm:w-64" : "w-24"
            )}
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* CSV Import */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVImport}
          className="hidden"
        />
      </div>

      {/* Simplified Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <button
                    onClick={() => handleSort("sku")}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600"
                  >
                    SKU
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600"
                  >
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="w-[120px] text-right">
                  <button
                    onClick={() => handleSort("price")}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600 ml-auto"
                  >
                    Price
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                    {searchQuery ? "No items found" : "No items yet"}
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

      {/* Floating Action Button */}
      <button
        onClick={handleNewItem}
        className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-10 transition-transform hover:scale-110"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Edit/Add Modal */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <SheetTitle>
              {editingItem?.id ? "Edit Item" : "Add New Item"}
            </SheetTitle>
          </SheetHeader>

          {editingItem && (
            <>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="space-y-4">
                  {validationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Item Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={editingItem.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      placeholder="Coffee Latte"
                      className="placeholder:text-slate-400/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>SKU (Barcode)</Label>
                    <Input
                      value={editingItem.sku || ""}
                      onChange={(e) => handleFieldChange("sku", e.target.value)}
                      placeholder="COFFEE-001"
                      className="placeholder:text-slate-400/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Selling Price (Rp) <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={priceDisplay}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="25,000"
                      className="placeholder:text-slate-400/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          {editingItem.category || "Select or type category..."}
                          <ArrowUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="max-h-[80vh] flex flex-col p-0">
                        <SheetHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                          <SheetTitle>Select or Add Category</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-6 min-h-[200px]">
                          <Command className="rounded-lg border">
                            <CommandInput 
                              placeholder="Type to search or add new category..." 
                              value={categorySearch}
                              onValueChange={setCategorySearch}
                              className="placeholder:text-slate-400/60"
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="p-4 text-center text-sm text-slate-500">
                                  No category found
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
                        {/* Sticky Footer with Create Button */}
                        {categorySearch && filteredCategories.length === 0 && (
                          <div className="flex-shrink-0 p-6 pt-4 border-t bg-background">
                            <Button
                              onClick={() => handleCategorySelect(categorySearch)}
                              className="w-full"
                              size="lg"
                            >
                              Create "{capitalizeWords(categorySearch)}"
                            </Button>
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>
                    <p className="text-xs text-slate-500/60">
                      Tap to select existing or type new category
                    </p>
                  </div>

                  {editingItem.id && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Active Status</p>
                        <p className="text-xs text-slate-500/60">
                          Inactive items hidden from POS
                        </p>
                      </div>
                      <Switch
                        checked={editingItem.isActive !== false}
                        onCheckedChange={(checked) => handleFieldChange("isActive", checked)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer with Action Buttons */}
              <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t bg-background space-y-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCloseSheet} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveItem}
                    disabled={!editingItem.name || editingItem.price <= 0}
                    className="flex-1"
                  >
                    Save
                  </Button>
                </div>

                {editingItem.id && (
                  <Button
                    onClick={handleDeleteItem}
                    disabled={!canDelete}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {canDelete ? "Delete Item" : "Cannot Delete (Used in Transactions)"}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}