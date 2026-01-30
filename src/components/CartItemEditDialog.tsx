import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CartItem } from "@/types";
import { translate } from "@/lib/translations";
import { Language } from "@/types";
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react";

interface CartItemEditDialogProps {
  open: boolean;
  onClose: () => void;
  item: CartItem | null;
  onSave: (updatedItem: CartItem) => void;
  onDelete: () => void;
  allowPriceOverride: boolean;
  language: Language;
}

export function CartItemEditDialog({
  open,
  onClose,
  item,
  onSave,
  onDelete,
  allowPriceOverride,
  language
}: CartItemEditDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setUnitPrice(item.basePrice);
      setHasChanges(false);
    }
  }, [item]);

  if (!item) return null;

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(0, quantity + delta);
    setQuantity(newQty);
    setHasChanges(true);

    if (newQty === 0) {
      setShowDeleteConfirm(true);
    }
  };

  const handlePriceChange = (value: string) => {
    const parsed = parseFloat(value) || 0;
    setUnitPrice(Math.max(0, parsed));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (quantity === 0) {
      setShowDeleteConfirm(true);
      return;
    }

    const updatedItem: CartItem = {
      ...item,
      quantity,
      basePrice: unitPrice,
      totalPrice: quantity * unitPrice
    };

    onSave(updatedItem);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  const handleContinueEditing = () => {
    setShowCancelConfirm(false);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
    onClose();
  };

  const totalPrice = quantity * unitPrice;

  return (
    <>
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-[420px] max-w-[90vw] rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{translate("pos.editItem", language)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Item Info */}
            <div className="space-y-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <p className="font-semibold text-base">{item.name}</p>
              {item.sku && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.sku}</p>
              )}
            </div>

            {/* Quantity Controls */}
            <div className="space-y-2">
              <Label>{translate("pos.quantity", language)}</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  className="h-14 w-14 rounded-xl"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <div className="flex-1 text-center">
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setQuantity(Math.max(0, val));
                      setHasChanges(true);
                    }}
                    className="text-center text-3xl font-bold h-14 rounded-xl"
                    min="0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                  className="h-14 w-14 rounded-xl"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Price Override */}
            {allowPriceOverride && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {translate("pos.unitPrice", language)}
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    ({translate("pos.overrideEnabled", language)})
                  </span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
                  <Input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="pl-12 text-lg font-semibold h-12 rounded-xl"
                    min="0"
                    step="1000"
                  />
                </div>
                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    {translate("pos.priceOverrideWarning", language)}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {!allowPriceOverride && (
              <div className="space-y-2">
                <Label>{translate("pos.unitPrice", language)}</Label>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">Rp {unitPrice.toLocaleString("id-ID")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ({translate("pos.priceOverrideDisabled", language)})
                  </p>
                </div>
              </div>
            )}

            {/* Total Price */}
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4">
              <div className="flex justify-between items-center text-white">
                <span className="text-sm font-medium">{translate("pos.total", language)}</span>
                <span className="text-2xl font-black">Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Delete Button */}
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 rounded-xl"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {translate("pos.deleteItem", language)}
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              className="flex-1 rounded-xl"
            >
              {translate("common.cancel", language)}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges}
              className={`flex-1 rounded-xl transition-all ${
                hasChanges 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              {translate("common.save", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("pos.confirmDelete", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("pos.confirmDeleteMessage", language)} "{item.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)} className="rounded-xl">
              {translate("common.cancel", language)}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {translate("common.delete", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("pos.discardChanges", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("pos.discardChangesMessage", language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleContinueEditing} className="rounded-xl">
              {translate("common.continueEditing", language)}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {translate("common.discard", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}