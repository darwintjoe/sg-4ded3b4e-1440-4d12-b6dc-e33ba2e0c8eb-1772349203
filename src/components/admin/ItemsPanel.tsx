import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApp } from "@/contexts/AppContext";
import { db } from "@/lib/db";
import { Item } from "@/types";
import { Plus, Edit, Trash2, Search, Package, ArrowUpDown, Upload, AlertCircle, Download } from "lucide-react";

type SortField = "sku" | "name" | "price";
type SortDirection = "asc" | "desc";

export function ItemsPanel() {
  const { language } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hideInactive, setHideInactive] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [gs1Loading, setGs1Loading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const allItems = await db.getAll<Item>("items");
    setItems(allItems);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const validateUniqueness = async (item: Item): Promise<string | null> => {
    const allItems = await db.getAll<Item>("items");
    
    // Check SKU uniqueness (if SKU provided)
    if (item.sku) {
      const duplicateSku = allItems.find(
        (i) => i.sku?.toLowerCase() === item.sku?.toLowerCase() && i.id !== item.id
      );
      if (duplicateSku) {
        return `SKU "${item.sku}" already exists`;
      }
    }

    // Check Name uniqueness
    const duplicateName = allItems.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.id !== item.id
    );
    if (duplicateName) {
      return `Item name "${item.name}" already exists`;
    }

    return null;
  };

  const checkItemTransacted = async (itemId: number): Promise<boolean> => {
    const transactions = await db.getAll("transactions");
    return transactions.some((txn: any) =>
      txn.items?.some((cartItem: any) => cartItem.itemId === itemId)
    );
  };

  const lookupGS1Barcode = async (sku: string) => {
    if (!sku || sku.length < 8) return;

    setGs1Loading(true);
    try {
      // GS1 Verified API lookup (silent, non-blocking)
      // Note: This is a placeholder - actual implementation requires GS1 API credentials
      const response = await fetch(`https://www.gs1.org/services/verified-by-gs1/results?gtin=${sku}`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.productName && editingItem) {
          setEditingItem({ ...editingItem, name: data.productName });
        }
      }
    } catch (error) {
      // Silent fail - GS1 lookup is a suggestion only
      console.log("GS1 lookup unavailable:", error);
    } finally {
      setGs1Loading(false);
    }
  };

  const handleSaveItem = async (saveAndNext: boolean = false) => {
    if (!editingItem) return;

    // Validation
    if (!editingItem.name.trim()) {
      setValidationError("Item name is required");
      return;
    }

    if (editingItem.price <= 0) {
      setValidationError("Selling price must be greater than 0");
      return;
    }

    // Check uniqueness
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

    if (saveAndNext) {
      // Reset form for next item
      setEditingItem({
        name: "",
        sku: "",
        price: 0,
        category: "General",
        variants: [],
        modifiers: [],
        isActive: true
      });
    } else {
      setIsSheetOpen(false);
      setEditingItem(null);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    if (!item.id) return;

    // Check if item has been transacted
    const hasTransactions = await checkItemTransacted(item.id);
    
    if (hasTransactions) {
      if (confirm(`"${item.name}" has been sold and cannot be deleted. Set as inactive instead?`)) {
        await db.put("items", { ...item, isActive: false });
        await loadItems();
      }
    } else {
      if (confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) {
        await db.delete("items", item.id);
        await loadItems();
      }
    }
  };

  const handleToggleActive = async (item: Item) => {
    if (!item.id) return;
    await db.put("items", { ...item, isActive: !item.isActive });
    await loadItems();
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
    setHasUnsavedChanges(false);
    setValidationError("");
    setIsSheetOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem({ ...item });
    setHasUnsavedChanges(false);
    setValidationError("");
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Discard them?")) {
        setIsSheetOpen(false);
        setEditingItem(null);
        setHasUnsavedChanges(false);
        setValidationError("");
      }
    } else {
      setIsSheetOpen(false);
      setEditingItem(null);
      setValidationError("");
    }
  };

  const handleFieldChange = (field: keyof Item, value: any) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, [field]: value });
    setHasUnsavedChanges(true);

    // Trigger GS1 lookup when SKU changes
    if (field === "sku" && !editingItem.id) {
      lookupGS1Barcode(value);
    }
  };

  const downloadCSVTemplate = () => {
    const template = "sku,name,price,category\nPROD-001,Sample Item,25000,General\nPROD-002,Another Item,15000,Beverages";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "items_template.csv";
    a.click();
  };

  const addSampleData = async () => {
    const sampleItems = [
      { sku: "TEA-001", name: "Test Tea", price: 15000, category: "Beverages" },
      { sku: "CAKE-001", name: "Test Cake", price: 45000, category: "Food" },
      { sku: "SAND-001", name: "Test Sandwich", price: 35000, category: "Food" },
      { sku: "COFFEE-001", name: "Test Coffee", price: 20000, category: "Beverages" },
      { sku: "JUICE-001", name: "Test Juice", price: 18000, category: "Beverages" }
    ];

    let added = 0;
    for (const item of sampleItems) {
      const error = await validateUniqueness({ ...item, variants: [], modifiers: [], isActive: true });
      if (!error) {
        await db.add("items", { ...item, id: Date.now() + added, variants: [], modifiers: [], isActive: true });
        added++;
      }
    }

    await loadItems();
    alert(`Added ${added} sample items for testing!`);
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });

      if (row.name && row.price) {
        const newItem: Item = {
          sku: row.sku || "",
          name: row.name,
          price: parseFloat(row.price) || 0,
          category: row.category || "General",
          variants: [],
          modifiers: [],
          isActive: true
        };

        // Check uniqueness before import
        const error = await validateUniqueness(newItem);
        if (!error) {
          await db.add("items", { ...newItem, id: Date.now() + i });
          imported++;
        } else {
          skipped++;
        }
      }
    }

    await loadItems();
    alert(`Import complete!\nImported: ${imported}\nSkipped (duplicates): ${skipped}`);
    event.target.value = "";
  };

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = !hideInactive || item.isActive !== false;
      return matchesSearch && matchesActive;
    })
    .sort((a, b) => {
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

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={hideInactive}
              onCheckedChange={setHideInactive}
              id="hide-inactive"
            />
            <Label htmlFor="hide-inactive" className="text-sm cursor-pointer">
              Hide Inactive
            </Label>
          </div>

          <Button variant="outline" size="sm" onClick={downloadCSVTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()} 
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />

          <Button 
            variant="outline" 
            size="sm" 
            onClick={addSampleData} 
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Add Samples
          </Button>

          <Button onClick={handleNewItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* List View Table */}
      {filteredItems.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Package className="h-16 w-16 mx-auto text-slate-300" />
            <p className="text-slate-500">
              {searchQuery ? "No items found" : "No items yet. Add your first product!"}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("sku")}
                    className="hover:bg-transparent p-0 h-auto font-semibold"
                  >
                    SKU
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("name")}
                    className="hover:bg-transparent p-0 h-auto font-semibold"
                  >
                    Item Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[150px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("price")}
                    className="hover:bg-transparent p-0 h-auto font-semibold"
                  >
                    Selling Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={item.isActive === false ? "opacity-50 bg-slate-50 dark:bg-slate-900" : ""}
                >
                  <TableCell className="font-mono text-sm">{item.sku || "-"}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                    Rp {item.price.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive === false ? "secondary" : "default"}>
                      {item.isActive === false ? "Inactive" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(item)}
                        className="h-8 px-2"
                      >
                        {item.isActive === false ? "Activate" : "Suspend"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                        className="h-8 px-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                        className="h-8 px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Full Screen Sheet Modal */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingItem?.id ? "Edit Item" : "Add New Item"}
            </SheetTitle>
          </SheetHeader>

          {editingItem && (
            <div className="space-y-6 mt-6">
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Coffee Latte"
                    className={gs1Loading ? "animate-pulse" : ""}
                  />
                  {gs1Loading && (
                    <p className="text-xs text-blue-600">Looking up barcode name...</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>SKU (Barcode)</Label>
                  <Input
                    value={editingItem.sku || ""}
                    onChange={(e) => handleFieldChange("sku", e.target.value)}
                    placeholder="COFFEE-001 or 8901234567890"
                  />
                  <p className="text-xs text-slate-500">
                    Enter barcode to auto-lookup product name from GS1
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Selling Price (Rp) *</Label>
                  <Input
                    type="number"
                    value={editingItem.price}
                    onChange={(e) => handleFieldChange("price", parseFloat(e.target.value) || 0)}
                    placeholder="25000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editingItem.category}
                    onChange={(e) => handleFieldChange("category", e.target.value)}
                    placeholder="Beverages"
                  />
                </div>

                {editingItem.id && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-medium">Item Status</p>
                      <p className="text-xs text-slate-500">
                        Inactive items are hidden from POS search
                      </p>
                    </div>
                    <Switch
                      checked={editingItem.isActive !== false}
                      onCheckedChange={(checked) => handleFieldChange("isActive", checked)}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                ℹ️ Variants and modifiers management will be enhanced in Stage 4
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={handleCloseSheet}>
                  Cancel
                </Button>
                {!editingItem.id && (
                  <Button
                    onClick={() => handleSaveItem(true)}
                    disabled={!editingItem.name || editingItem.price <= 0}
                    variant="secondary"
                  >
                    Save & Next
                  </Button>
                )}
                <Button
                  onClick={() => handleSaveItem(false)}
                  disabled={!editingItem.name || editingItem.price <= 0}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}