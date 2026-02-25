import { forwardRef } from "react";
import type { Transaction, Settings } from "@/types";

interface ReceiptPreviewProps {
  transaction: Transaction;
  settings: Settings;
  isReprint?: boolean;
  showWatermark?: boolean;
  className?: string;
}

export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  ({ transaction, settings, isReprint = false, showWatermark = false, className = "" }, ref) => {
    
    // Generate receipt number from transaction ID or timestamp
    const receiptNumber = transaction.id?.toString().slice(-5).padStart(5, "0") || 
      String(Math.floor((transaction.timestamp % 100000) / 10)).padStart(5, "0");
    
    const receiptDate = new Date(transaction.timestamp);
    
    // Calculate taxes from transaction data
    const tax1Amount = settings.tax1Enabled ? 
      (settings.tax1Inclusive ? 
        transaction.items.reduce((sum, item) => sum + (item.totalPrice - (item.totalPrice / (1 + settings.tax1Rate / 100))), 0)
        : transaction.subtotal * (settings.tax1Rate / 100)) 
      : 0;
    
    const tax2Amount = settings.tax2Enabled ? 
      (transaction.subtotal * (settings.tax2Rate / 100))
      : 0;

    return (
      <div 
        ref={ref}
        className={`w-full bg-white text-black p-4 text-xs border border-gray-200 shadow-sm relative ${className}`}
        style={{ fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif" }}
      >
        {/* Receipt Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-3 space-y-0.5">
            {settings.receiptLogoBase64 && (
              <img 
                src={settings.receiptLogoBase64} 
                alt="Logo" 
                className="h-10 mx-auto mb-2" 
              />
            )}
            <div className="font-bold text-sm tracking-tight">{settings.businessName}</div>
            {settings.businessAddress && (
              <div className="whitespace-pre-line text-[10px] text-gray-600 leading-tight">{settings.businessAddress}</div>
            )}
            {settings.taxId && (
              <div className="text-[10px] text-gray-500">{settings.taxId}</div>
            )}
          </div>
          
          {/* Receipt Info Line */}
          <div className="flex justify-between text-[10px] text-gray-600 border-b border-dashed border-gray-400 pb-2 mb-2">
            <span className="font-bold">#{receiptNumber}</span>
            <span>
              {receiptDate.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
              {receiptDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          
          {/* Cashier + REPRINTED text for printing */}
          <div className="text-[10px] text-gray-600 mb-2">
            <div>Kasir: {transaction.cashierName}</div>
            {(isReprint || showWatermark) && (
              <div className="font-bold text-black mt-1">*** REPRINTED ***</div>
            )}
          </div>

          {/* Items */}
          <div className="border-t border-dashed border-gray-400 py-2 space-y-2">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="font-medium text-[11px] leading-tight">{item.name}</div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>{item.quantity} x {item.basePrice.toLocaleString("id-ID")}</span>
                  <span>{item.totalPrice.toLocaleString("id-ID")}</span>
                </div>
                {(item.variant || (item.modifiers && item.modifiers.length > 0)) && (
                  <div className="text-[9px] text-gray-500 pl-2">
                    {item.variant && <div>• {item.variant}</div>}
                    {item.modifiers?.map((m, i) => <div key={i}>+ {m}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>Subtotal</span>
              <span>{transaction.subtotal.toLocaleString("id-ID")}</span>
            </div>
            {settings.tax1Enabled && (
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{settings.tax1Label} ({settings.tax1Rate}%)</span>
                <span>{Math.round(tax1Amount).toLocaleString("id-ID")}</span>
              </div>
            )}
            {settings.tax2Enabled && (
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{settings.tax2Label} ({settings.tax2Rate}%)</span>
                <span>{Math.round(tax2Amount).toLocaleString("id-ID")}</span>
              </div>
            )}
            
            {/* TOTAL - Double height simulation */}
            <div className="flex justify-between items-center font-black border-t-2 border-gray-800 border-b-2 py-2 mt-2 mb-1">
              <span className="text-base tracking-tight">TOTAL</span>
              <span className="text-base tracking-tight">{transaction.total.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Payment & Change */}
          <div className="pt-2 space-y-1">
            {transaction.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="capitalize">
                  {p.method === "cash" ? "Tunai" :
                   p.method === "qris-static" ? "QRIS" :
                   p.method === "qris-dynamic" ? "QRIS" :
                   p.method === "card" ? "Kartu" :
                   p.method === "transfer" ? "Transfer" :
                   p.method === "voucher" ? "Voucher" :
                   p.method}
                </span>
                <span>{p.amount.toLocaleString("id-ID")}</span>
              </div>
            ))}
            {transaction.change && transaction.change > 0 && (
              <div className="flex justify-between font-bold text-[11px] border-t border-gray-300 pt-1 mt-1">
                <span>Kembalian</span>
                <span>{transaction.change.toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="text-center text-[10px] whitespace-pre-line mt-4 pt-2 border-t border-dashed border-gray-400 text-gray-600">
            {settings.receiptFooter || "Terima kasih atas kunjungan Anda!"}
          </div>
          
          {settings.tax1Inclusive && settings.tax1Enabled && (
            <div className="text-center text-[9px] italic mt-1 text-gray-400">
              Harga sudah termasuk {settings.tax1Label} {settings.tax1Rate}%
            </div>
          )}
        </div>
      </div>
    );
  }
);

ReceiptPreview.displayName = "ReceiptPreview";