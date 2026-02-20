import { useState, useEffect, useRef } from "react";
import { Search, Plus, ArrowUpFromLine, ArrowDownToLine, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/AppContext";
import { Item } from "@/types";
import { translate } from "@/lib/translations";
import { toast } from "@/hooks/use-toast";

export function ItemsPanel() {
  const {
    items,
    categories,
    addItem,
    updateItem,
    deleteItem,
    importItemsFromCSV,
    language
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "",
    price: "",
    stock: "",
    imageUrl: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" ? item.isActive : !item.isActive);
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleAddItem = () => {
    if (!formData.sku || !formData.name || !formData.category || !formData.price) {
      toast({
        title: translate("common.error", language),
        description: translate("items.fillRequired", language),
        variant: "destructive"
      });
      return;
    }

    const newItem: Omit<Item, "id"> = {
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      imageUrl: formData.imageUrl || undefined,
      isActive: true
    };

    addItem(newItem);
    setIsAddDialogOpen(false);
    resetForm();
    toast({
      title: translate("common.success", language),
      description: translate("items.itemAdded", language)
    });
  };

  const handleEditItem = () => {
    if (!selectedItem) return;

    if (!formData.sku || !formData.name || !formData.category || !formData.price) {
      toast({
        title: translate("common.error", language),
        description: translate("items.fillRequired", language),
        variant: "destructive"
      });
      return;
    }

    const updatedItem: Item = {
      ...selectedItem,
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      imageUrl: formData.imageUrl || undefined
    };

    updateItem(updatedItem);
    setIsEditDialogOpen(false);
    setSelectedItem(null);
    resetForm();
    toast({
      title: translate("common.success", language),
      description: translate("items.itemUpdated", language)
    });
  };

  const handleDeleteItem = () => {
    if (!selectedItem) return;
    deleteItem(selectedItem.id);
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
    toast({
      title: translate("common.success", language),
      description: translate("items.itemDeleted", language)
    });
  };

  const handleToggleActive = (item: Item) => {
    updateItem({ ...item, isActive: !item.isActive });
    toast({
      title: translate("common.success", language),
      description: item.isActive 
        ? translate("items.itemDeactivated", language)
        : translate("items.itemActivated", language)
    });
  };

  const openEditDialog = (item: Item) => {
    setSelectedItem(item);
    setFormData({
      sku: item.sku,
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stock: item.stock.toString(),
      imageUrl: item.imageUrl || ""
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (item: Item) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      sku: "",
      name: "",
      category: "",
      price: "",
      stock: "",
      imageUrl: ""
    });
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importItemsFromCSV(file);
      toast({
        title: translate("common.success", language),
        description: translate("items.importSuccess", language)
      });
    } catch (error) {
      toast({
        title: translate("common.error", language),
        description: translate("items.importError", language),
        variant: "destructive"
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCSVExport = () => {
    const headers = ["SKU", "Name", "Category", "Price", "Stock", "Image URL", "Active"];
    const rows = items.map(item => [
      item.sku,
      item.name,
      item.category,
      item.price.toString(),
      item.stock.toString(),
      item.imageUrl || "",
      item.isActive ? "Yes" : "No"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `items_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: translate("common.success", language),
      description: translate("items.exportSuccess", language)
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-auto min-w-[120px] flex-shrink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate("common.allCategories", language)}</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
            <SelectTrigger className="w-auto min-w-[100px] flex-shrink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate("common.all", language)}</SelectItem>
              <SelectItem value="active">{translate("common.active", language)}</SelectItem>
              <SelectItem value="inactive">{translate("common.inactive", language)}</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="min-w-[90px]"
          >
            <ArrowDownToLine className="h-4 w-4 mr-1.5" />
            <span>{translate("common.import", language)}</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCSVExport}
            className="min-w-[90px]"
          >
            <ArrowUpFromLine className="h-4 w-4 mr-1.5" />
            <span>{translate("common.export", language)}</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={translate("common.searchPlaceholder", language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCSVImport}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{translate("items.sku", language)}</TableHead>
              <TableHead>{translate("items.name", language)}</TableHead>
              <TableHead>{translate("items.category", language)}</TableHead>
              <TableHead>{translate("items.price", language)}</TableHead>
              <TableHead>{translate("items.stock", language)}</TableHead>
              <TableHead>{translate("common.status", language)}</TableHead>
              <TableHead className="text-right">{translate("common.actions", language)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {translate("items.noItems", language)}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <span>{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={item.stock > 10 ? "default" : item.stock > 0 ? "secondary" : "destructive"}>
                      {item.stock}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(item)}
                    >
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? translate("common.active", language) : translate("common.inactive", language)}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(item)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Button 
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => {
          resetForm();
          setIsAddDialogOpen(true);
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("items.addItem", language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sku">{translate("items.sku", language)} *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="name">{translate("items.name", language)} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">{translate("items.category", language)} *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder={translate("items.selectCategory", language)} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">{translate("items.price", language)} *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="stock">{translate("items.stock", language)}</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="imageUrl">{translate("items.imageUrl", language)}</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {translate("common.cancel", language)}
            </Button>
            <Button onClick={handleAddItem}>
              {translate("common.add", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("items.editItem", language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-sku">{translate("items.sku", language)} *</Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">{translate("items.name", language)} *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">{translate("items.category", language)} *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-price">{translate("items.price", language)} *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-stock">{translate("items.stock", language)}</Label>
              <Input
                id="edit-stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-imageUrl">{translate("items.imageUrl", language)}</Label>
              <Input
                id="edit-imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {translate("common.cancel", language)}
            </Button>
            <Button onClick={handleEditItem}>
              {translate("common.save", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("items.deleteConfirm", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("items.deleteWarning", language)}
              {selectedItem && (
                <div className="mt-2 font-semibold">
                  {selectedItem.name} ({selectedItem.sku})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translate("common.cancel", language)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground">
              {translate("common.delete", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}