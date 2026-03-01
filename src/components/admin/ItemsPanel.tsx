import { useState, useMemo } from "react";
import { Plus, Search, Download, Upload, Pencil, Trash2, Package, BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";
import type { Item } from "@/types";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export function ItemsPanel() {
  const { items, deleteItem, settings, language } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.category || "Uncategorized"));
    return ["all", ...Array.from(cats)];
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.sku?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const handleExport = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `items-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedItems = JSON.parse(e.target?.result as string);
        console.log("Imported items:", importedItems);
        // TODO: Add items to database
      } catch (error) {
        console.error("Failed to import items:", error);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteClick = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete?.id) {
      await deleteItem(itemToDelete.id);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Header with Search and Filters */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={translate("items.searchPlaceholder", language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={translate("items.allCategories", language)} />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === "all" ? translate("items.allCategories", language) : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {translate("items.export", language)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('import-file')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {translate("items.import", language)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-50" />
              <p>{translate("items.noItems", language)}</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.sku && (
                            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(item)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{formatCurrency(item.price)}</span>
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                        {typeof item.stock === 'number' && (
                          <Badge variant={item.stock > 0 ? "default" : "destructive"}>
                            {translate("items.stock", language)}: {item.stock}
                          </Badge>
                        )}
                        {item.isActive === false && (
                          <Badge variant="outline">{translate("items.inactive", language)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => setShowAddDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate("items.deleteConfirm", language)}</DialogTitle>
            <DialogDescription>
              {translate("items.deleteWarning", language).replace("{name}", itemToDelete?.name || "")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {translate("common.cancel", language)}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {translate("common.delete", language)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog - Placeholder */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate("items.addNew", language)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {translate("items.formPlaceholder", language)}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}