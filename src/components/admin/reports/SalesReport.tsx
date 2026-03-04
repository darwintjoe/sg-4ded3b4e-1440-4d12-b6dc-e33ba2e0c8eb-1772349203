import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DailyPaymentSales, MonthlySalesSummary, Transaction, PaymentMethod } from "@/types";
import { db } from "@/lib/db";
import { DollarSign, Receipt, TrendingUp } from "lucide-react";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDateRange, formatBusinessDate, getYearMonth } from "@/lib/dateRangeUtils";
import type { TimeRange } from "@/lib/dateRangeUtils";

type SalesTimeRange = "MTD" | "30D" | "YTD" | "12M" | "5Y";

interface SalesReportProps {
  language: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

// All possible payment methods
const ALL_PAYMENT_METHODS: PaymentMethod[] = ["cash", "qris-static", "qris-dynamic", "card", "voucher", "transfer"];

// Display labels for payment methods
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  "cash": "Cash",
  "qris-static": "QR-S",
  "qris-dynamic": "QR-D",
  "card": "Card",
  "voucher": "Vchr",
  "transfer": "Trf"
};

// Convert payment method to safe key for object properties
const methodToKey = (method: PaymentMethod): string => {
  return method.replace("-", "");
};

interface PaymentAmounts {
  cash: number;
  qrisstatic: number;
  qrisdynamic: number;
  card: number;
  voucher: number;
  transfer: number;
}

interface AggregatedSalesData {
  key: string;
  fullDate: string;
  revenue: number;
  receipts: number;
  payments: PaymentAmounts;
}

const emptyPayments = (): PaymentAmounts => ({
  cash: 0,
  qrisstatic: 0,
  qrisdynamic: 0,
  card: 0,
  voucher: 0,
  transfer: 0
});

export function SalesReport({ language, containerRef }: SalesReportProps) {
  const locale = language === "id" ? "id-ID" : "en-US";
  const salesChartRef = useRef<HTMLDivElement>(null);
  const salesTableRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toFixed(2) + "B";
    } else if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(2) + "M";
    } else if (amount >= 1_000) {
      return (amount / 1_000).toFixed(0) + "K";
    }
    return amount.toLocaleString();
  };

  const t = {
    reports: {
      salesReport: "Sales Report",
      dailySalesData: "Daily Sales Data",
      monthlySalesData: "Monthly Sales Data",
      noData: "No data available for the selected period",
      date: "Date",
      month: "Month",
      year: "Year",
      revenue: "Revenue",
      receipts: "Receipts",
      total: "Total",
      totalRevenue: "Total Revenue",
      totalReceipts: "Total Receipts",
      avgTransaction: "Avg Transaction",
      exportPDF: "Export PDF",
      exportImage: "Export Image",
      exporting: "Exporting...",
    }
  };

  const [salesTimeRange, setSalesTimeRange] = useState<SalesTimeRange>("MTD");
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [salesStats, setSalesStats] = useState({
    totalRevenue: 0,
    totalReceipts: 0,
    avgTransaction: 0
  });
  const [salesData, setSalesData] = useState<AggregatedSalesData[]>([]);
  const [salesDateRange, setSalesDateRange] = useState<string>("");
  const [salesPeriodLabel, setSalesPeriodLabel] = useState<string>("");
  const [activePaymentMethods, setActivePaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    loadSalesReport();
  }, [salesTimeRange]);

  // Aggregate transactions by business date and payment method
  const aggregateTransactions = (transactions: Transaction[]): Map<string, AggregatedSalesData> => {
    const map = new Map<string, AggregatedSalesData>();
    
    for (const txn of transactions) {
      const existing = map.get(txn.businessDate);
      
      // Calculate payment amounts for this transaction
      const payments = emptyPayments();
      for (const payment of txn.payments) {
        const key = methodToKey(payment.method) as keyof PaymentAmounts;
        if (key in payments) {
          payments[key] += payment.amount;
        }
      }
      
      if (existing) {
        existing.revenue += txn.total;
        existing.receipts += 1;
        // Add payments
        for (const method of ALL_PAYMENT_METHODS) {
          const key = methodToKey(method) as keyof PaymentAmounts;
          existing.payments[key] += payments[key];
        }
      } else {
        map.set(txn.businessDate, {
          key: txn.businessDate.substring(5),
          fullDate: txn.businessDate,
          revenue: txn.total,
          receipts: 1,
          payments
        });
      }
    }
    
    return map;
  };

  // Single-pass monthly aggregation
  const aggregateMonthlyData = (monthly: MonthlySalesSummary[]): Map<string, AggregatedSalesData> => {
    const map = new Map<string, AggregatedSalesData>();
    
    for (const m of monthly) {
      map.set(m.yearMonth, {
        key: m.yearMonth.substring(5, 7),
        fullDate: m.yearMonth,
        revenue: m.totalRevenue,
        receipts: m.totalReceipts,
        payments: {
          cash: m.cashAmount || 0,
          qrisstatic: m.qrisStaticAmount || 0,
          qrisdynamic: m.qrisDynamicAmount || 0,
          card: (m as any).cardAmount || 0,
          voucher: m.voucherAmount || 0,
          transfer: (m as any).transferAmount || 0
        }
      });
    }
    
    return map;
  };

  // Single-pass yearly aggregation from monthly data
  const aggregateYearlyData = (data: AggregatedSalesData[]): Map<string, AggregatedSalesData> => {
    const map = new Map<string, AggregatedSalesData>();
    
    for (const d of data) {
      const year = d.fullDate.substring(0, 4);
      const existing = map.get(year);
      
      if (existing) {
        existing.revenue += d.revenue;
        existing.receipts += d.receipts;
        for (const method of ALL_PAYMENT_METHODS) {
          const key = methodToKey(method) as keyof PaymentAmounts;
          existing.payments[key] += d.payments[key];
        }
      } else {
        map.set(year, {
          key: year,
          fullDate: year,
          revenue: d.revenue,
          receipts: d.receipts,
          payments: { ...d.payments }
        });
      }
    }
    
    return map;
  };

  // Calculate totals in single pass
  const calculateTotals = (data: AggregatedSalesData[]) => {
    let totalRevenue = 0;
    let totalReceipts = 0;
    
    for (const d of data) {
      totalRevenue += d.revenue;
      totalReceipts += d.receipts;
    }
    
    return {
      totalRevenue,
      totalReceipts,
      avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
    };
  };

  // Determine which payment methods have any transactions
  const findActivePaymentMethods = (data: AggregatedSalesData[]): PaymentMethod[] => {
    const totals = emptyPayments();
    
    for (const d of data) {
      for (const method of ALL_PAYMENT_METHODS) {
        const key = methodToKey(method) as keyof PaymentAmounts;
        totals[key] += d.payments[key];
      }
    }
    
    // Return only methods with values > 0
    return ALL_PAYMENT_METHODS.filter(method => {
      const key = methodToKey(method) as keyof PaymentAmounts;
      return totals[key] > 0;
    });
  };

  const loadSalesReport = async () => {
    try {
      const { startDate, endDate, label, useDailySummary, useMonthlySummary } = getDateRange(
        salesTimeRange as TimeRange
      );

      setSalesPeriodLabel(label);
      setSalesDateRange(`${formatBusinessDate(startDate)} - ${formatBusinessDate(endDate)}`);

      const startDateStr = formatBusinessDate(startDate);
      const endDateStr = formatBusinessDate(endDate);
      const currentMonth = getYearMonth(new Date());

      if (useMonthlySummary) {
        // YTD, 12M, 5Y - Use monthly summary + current month from transactions
        const startMonth = getYearMonth(startDate);
        const endMonth = getYearMonth(endDate);

        // Batch fetch all data upfront
        const [allMonthly, allTransactions] = await Promise.all([
          db.getAll<MonthlySalesSummary>("monthlySalesSummary"),
          db.getAll<Transaction>("transactions")
        ]);

        // Filter monthly data (exclude current month - will use transactions)
        const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);
        
        // Filter current month transactions
        const currentMonthTransactions = allTransactions.filter(t => t.businessDate.startsWith(currentMonth));

        // Aggregate monthly data
        const dataMap = aggregateMonthlyData(filteredMonthly);

        // Add current month from transactions if needed
        if (endMonth >= currentMonth && currentMonthTransactions.length > 0) {
          const currentMonthData: AggregatedSalesData = {
            key: currentMonth.substring(5, 7),
            fullDate: currentMonth,
            revenue: 0,
            receipts: 0,
            payments: emptyPayments()
          };

          for (const txn of currentMonthTransactions) {
            currentMonthData.revenue += txn.total;
            currentMonthData.receipts += 1;
            for (const payment of txn.payments) {
              const key = methodToKey(payment.method) as keyof PaymentAmounts;
              if (key in currentMonthData.payments) {
                currentMonthData.payments[key] += payment.amount;
              }
            }
          }

          dataMap.set(currentMonth, currentMonthData);
        }

        // Convert to array and sort once
        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

        // Handle 5Y - aggregate by year
        if (salesTimeRange === "5Y") {
          const yearlyMap = aggregateYearlyData(sortedData);
          const yearlyData = Array.from(yearlyMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

          // Find active payment methods
          const activeMethods = findActivePaymentMethods(yearlyData);
          setActivePaymentMethods(activeMethods);

          // Prepare chart data with only active methods
          const chartData = yearlyData.map(d => {
            const chartItem: any = { name: d.key, fullDate: d.fullDate };
            for (const method of activeMethods) {
              const key = methodToKey(method) as keyof PaymentAmounts;
              chartItem[key] = d.payments[key];
            }
            return chartItem;
          });

          setSalesChartData(chartData);
          setSalesData(yearlyData.slice().sort((a, b) => b.fullDate.localeCompare(a.fullDate)));
          setSalesStats(calculateTotals(yearlyData));
        } else {
          // YTD, 12M - show individual months
          const activeMethods = findActivePaymentMethods(sortedData);
          setActivePaymentMethods(activeMethods);

          const chartData = sortedData.map(d => {
            const chartItem: any = { name: d.key, fullDate: d.fullDate };
            for (const method of activeMethods) {
              const key = methodToKey(method) as keyof PaymentAmounts;
              chartItem[key] = d.payments[key];
            }
            return chartItem;
          });

          setSalesChartData(chartData);
          setSalesData(sortedData.slice().sort((a, b) => b.fullDate.localeCompare(a.fullDate)));
          setSalesStats(calculateTotals(sortedData));
        }

      } else {
        // MTD, 30D - Query directly from transactions table
        const allTransactions = await db.getAll<Transaction>("transactions");
        const filtered = allTransactions.filter(t => t.businessDate >= startDateStr && t.businessDate <= endDateStr);
        
        // Single-pass aggregation from transactions
        const dataMap = aggregateTransactions(filtered);
        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

        // Find active payment methods
        const activeMethods = findActivePaymentMethods(sortedData);
        setActivePaymentMethods(activeMethods);

        // Prepare chart data with only active methods
        const chartData = sortedData.map(d => {
          const chartItem: any = { name: d.key, fullDate: d.fullDate };
          for (const method of activeMethods) {
            const key = methodToKey(method) as keyof PaymentAmounts;
            chartItem[key] = d.payments[key];
          }
          return chartItem;
        });

        setSalesChartData(chartData);
        setSalesData(sortedData.slice().sort((a, b) => b.fullDate.localeCompare(a.fullDate)));
        setSalesStats(calculateTotals(sortedData));
      }
    } catch (error) {
      console.error("Error loading sales report:", error);
      setSalesChartData([]);
      setSalesData([]);
      setSalesStats({ totalRevenue: 0, totalReceipts: 0, avgTransaction: 0 });
      setActivePaymentMethods([]);
    }
  };

  const isSalesMonthlyView = ["YTD", "12M", "5Y"].includes(salesTimeRange);

  // Pre-calculate table totals
  const tableTotals = {
    revenue: salesData.reduce((sum, row) => sum + row.revenue, 0),
    receipts: salesData.reduce((sum, row) => sum + row.receipts, 0),
    payments: ALL_PAYMENT_METHODS.reduce((acc, method) => {
      const key = methodToKey(method) as keyof PaymentAmounts;
      acc[key] = salesData.reduce((sum, row) => sum + row.payments[key], 0);
      return acc;
    }, emptyPayments())
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <div ref={salesChartRef} className="space-y-4 bg-white dark:bg-slate-950 p-4 rounded-lg">
        <div className="text-center space-y-1 pb-3 border-b">
          <h2 className="text-lg font-bold">{t.reports.salesReport}</h2>
          <p className="text-sm text-muted-foreground">{salesPeriodLabel}</p>
          <p className="text-xs text-muted-foreground">{salesDateRange}</p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <Card>
            <CardContent className="pt-2 pb-2 px-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-muted-foreground leading-tight">{t.reports.totalRevenue}</p>
                  <p className="text-sm font-bold leading-tight mt-0.5">{formatCurrency(salesStats.totalRevenue)}</p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-2 pb-2 px-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-muted-foreground leading-tight">{t.reports.totalReceipts}</p>
                  <p className="text-sm font-bold leading-tight mt-0.5">{salesStats.totalReceipts}</p>
                </div>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-2 pb-2 px-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-muted-foreground leading-tight">{t.reports.avgTransaction}</p>
                  <p className="text-sm font-bold leading-tight mt-0.5">{formatCurrency(salesStats.avgTransaction)}</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-2">
            <div className="space-y-3">
              <div>
                <div className="h-[320px]">
                  <StackedBarChart data={salesChartData} />
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-1 mt-3 pt-3 border-t overflow-x-auto">
              {(["MTD", "30D", "YTD", "12M", "5Y"] as SalesTimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={salesTimeRange === range ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSalesTimeRange(range)}
                  className="h-6 px-2 text-[10px] uppercase whitespace-nowrap"
                >
                  {range}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div ref={salesTableRef} className="bg-white dark:bg-slate-950 p-4 rounded-lg">
        <Card>
          <CardContent className="p-2">
            {salesData.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="text-[10px] font-medium py-1 px-2 whitespace-nowrap">
                          {salesTimeRange === "5Y" ? t.reports.year : (isSalesMonthlyView ? t.reports.month : t.reports.date)}
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2">Rev</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2">Rcpt</TableHead>
                        {activePaymentMethods.map(method => (
                          <TableHead key={method} className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">
                            {PAYMENT_METHOD_LABELS[method]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.map((row, idx) => (
                        <TableRow key={idx} className="border-b hover:bg-muted/50">
                          <TableCell className="text-[10px] font-medium py-1 px-2 whitespace-nowrap">{row.fullDate}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2">{row.receipts}</TableCell>
                          {activePaymentMethods.map(method => {
                            const key = methodToKey(method) as keyof PaymentAmounts;
                            return (
                              <TableCell key={method} className="text-right text-[10px] py-1 px-2 whitespace-nowrap">
                                {formatCurrency(row.payments[key])}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50">
                        <TableCell className="text-[10px] font-bold py-1 px-2">Total</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(tableTotals.revenue)}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2">{tableTotals.receipts}</TableCell>
                        {activePaymentMethods.map(method => {
                          const key = methodToKey(method) as keyof PaymentAmounts;
                          return (
                            <TableCell key={method} className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">
                              {formatCurrency(tableTotals.payments[key])}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground text-center py-6">
                {t.reports.noData}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}