import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/contexts/AppContext";
import { db } from "@/lib/db";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";
import { translate } from "@/lib/translations";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import type { Transaction } from "@/types";

const ITEMS_PER_PAGE = 50;

interface TransactionHistoryScreenProps {
  onBack: () => void;
}

export function TransactionHistoryScreen({ onBack }: TransactionHistoryScreenProps) {
  const { language, settings, currentUser } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  const loadTransactions = useCallback(async (reset = false) => {
    if (isLoading && !reset) return;
    
    setIsLoading(true);
    try {
      const offset = reset ? 0 : offsetRef.current;
      const allTransactions = await db.getAll<Transaction>("transactions");
      
      // Sort by timestamp descending (newest first)
      const sorted = allTransactions.sort((a, b) => b.timestamp - a.timestamp);
      
      // Paginate
      const paginated = sorted.slice(offset, offset + ITEMS_PER_PAGE);

      if (reset) {
        setTransactions(paginated);
        offsetRef.current = paginated.length;
      } else {
        setTransactions(prev => [...prev, ...paginated]);
        offsetRef.current += paginated.length;
      }

      setHasMore(paginated.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [isLoading]);

  useEffect(() => {
    loadTransactions(true);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isInitialLoad) {
          loadTransactions();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, isInitialLoad, loadTransactions]);

  const handlePrint = async () => {
    if (!selectedTransaction || !settings) return;

    setIsPrinting(true);
    try {
      const result = await bluetoothPrinter.printReceipt(
        selectedTransaction,
        settings,
        selectedTransaction.cashierName || currentUser?.name || "Cashier",
        true // isReprint = true
      );
      
      if (!result.success) {
        alert(result.error || "Failed to print receipt");
      }
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to print receipt. Please check printer connection.");
    } finally {
      setIsPrinting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatReceiptNumber = (transaction: Transaction) => {
    // Use transaction id, padded to 5 digits
    return transaction.id?.toString().slice(-5).padStart(5, "0") || "00000";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{translate("common.back", language)}</span>
          </Button>
          
          <button 
            onClick={onBack}
            className="text-xl font-black tracking-tight hover:opacity-70 transition-opacity"
          >
            SELL MORE
          </button>
          
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-lg font-bold mb-4">{translate("pos.transactionHistory", language)}</h2>
        
        {isInitialLoad ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              {translate("pos.noTransactions", language)}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:bg-slate-100 dark:active:bg-slate-750"
                onClick={() => setSelectedTransaction(transaction)}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Receipt # and Timestamp */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                      #{formatReceiptNumber(transaction)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTimestamp(transaction.timestamp)}
                    </div>
                  </div>
                  
                  {/* Landscape: Show Subtotal and Tax */}
                  {isLandscape && (
                    <>
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {translate("pos.subtotal", language)}
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(transaction.subtotal)}
                        </div>
                      </div>
                      {transaction.tax > 0 && (
                        <div className="text-right min-w-[80px]">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {translate("pos.tax", language)}
                          </div>
                          <div className="text-sm font-medium">
                            {formatCurrency(transaction.tax)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Total */}
                  <div className="text-right min-w-[100px]">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {translate("pos.total", language)}
                    </div>
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(transaction.total)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-4" />

            {isLoading && !isInitialLoad && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}

            {!hasMore && transactions.length > 0 && (
              <p className="text-center text-sm text-slate-400 py-4">
                {translate("pos.endOfHistory", language)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal - Uses shared ReceiptPreview */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{translate("pos.receiptDetails", language)}</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && settings && (
            <div className="relative">
              {/* Receipt Preview with REPRINTED watermark */}
              <ReceiptPreview
                transaction={selectedTransaction}
                settings={settings}
                isReprint={true}
                showWatermark={true}
              />
            </div>
          )}
          
          {/* Reprint Button */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              onClick={handlePrint}
              disabled={isPrinting || !bluetoothPrinter.isConnected()}
              className="w-full"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {translate("pos.printing", language)}
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  {translate("pos.reprintReceipt", language)}
                </>
              )}
            </Button>
            {!bluetoothPrinter.isConnected() && (
              <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
                {translate("pos.printerNotConnected", language)}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}