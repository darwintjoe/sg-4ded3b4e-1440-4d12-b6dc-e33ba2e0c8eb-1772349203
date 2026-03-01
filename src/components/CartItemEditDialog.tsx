import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CartItem, Language } from "@/types";
import { translate } from "@/lib/translations";
import { Minus, Plus, Trash2, AlertCircle, Save } from "lucide-react";

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

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
    onClose();
  };

  const totalPrice = quantity * unitPrice;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancel();
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>{translate("pos.editItem", language)}</DialogTitle>
          </DialogHeader>

          {showCancelConfirm ? (
            /* Cancel Confirmation View */
            <div className="flex-1 px-6 pb-6">
              <div className="space-y-6 py-8">
                <div className="text-center space-y-4">
                  <p className="text-base font-medium">
                    {translate("pos.confirmDiscardChanges", language)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    {translate("common.no", language)}
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleConfirmCancel}
                  >
                    {translate("common.yes", language)}
                  </Button>
                </div>
              </div>
            </div>
          ) : showDeleteConfirm ? (
            /* Delete Confirmation View */
            <div className="flex-1 px-6 pb-6">
              <div className="space-y-6 py-8">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-red-100 dark:bg-red-950 p-3">
                      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <p className="text-base font-medium">
                    {translate("pos.confirmRemoveItem", language)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {translate("common.no", language)}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleConfirmDelete}
                  >
                    {translate("common.yes", language)}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Form View */
            <>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
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
                </div>
              </div>

              {/* Sticky Footer with Action Buttons */}
              <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t bg-background">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel} 
                    className="flex-1 rounded-xl"
                  >
                    {translate("common.cancel", language)}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {translate("pos.deleteItem", language)}
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
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}