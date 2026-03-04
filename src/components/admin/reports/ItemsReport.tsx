import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyItemSales, MonthlyItemSales, Transaction, Language } from "@/types";
import { db } from "@/lib/db";
import { translate } from "@/lib/translations";
import { Package } from "lucide-react";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { PieChart } from "@/components/charts/PieChart";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ItemsTimeRange = "1d" | "7d" | "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
type ChartView = "bar" | "pie";
type SortBy = "quantity" | "revenue";

interface ItemsReportProps {
  language: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface AggregatedItemData {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
  transactions: number;
}

// Smooth Color Spectrum Generator
const generateSpectrumColor = (index: number, total: number): string => {
  const hue = (index / total) * 360;
  return `hsl(${hue}, 70%, 50%)`;
};

export function ItemsReport({ language, containerRef }: ItemsReportProps) {
  const locale = language === "id" ? "id-ID" : "en-US";

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
      topItemsData: "Top Items Data",
      noData: "No data available for the selected period",
      topItemsByQuantity: "Top Items by Quantity",
      topItemsByRevenue: "Top Items by Revenue",
      exportPDF: "Export PDF",
      exportImage: "Export Image",
      exporting: "Exporting...",
    }
  };

  const [itemsTimeRange, setItemsTimeRange] = useState<ItemsTimeRange>("1m");
  const [itemTopN, setItemTopN] = useState<10 | 20>(10);
  const [chartView, setChartView] = useState<ChartView>("bar");
  const [sortBy, setSortBy] = useState<SortBy>("quantity");
  const [topItems, setTopItems] = useState<Array<{
    itemName: string;
    quantity: number;
    revenue: number;
    color: string;
  }>>([]);
  const [topItemsData, setTopItemsData] = useState<any[]>([]);

  useEffect(() => {
    loadItemsReport();
  }, [itemsTimeRange, itemTopN, sortBy]);

  // Aggregate items from transactions (for 1d, 7d, 1m)
  const aggregateItemsFromTransactions = (transactions: Transaction[]): Map<number, AggregatedItemData> => {
    const map = new Map<number, AggregatedItemData>();
    
    for (const txn of transactions) {
      for (const item of txn.items) {
        const existing = map.get(item.itemId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.totalPrice;
          existing.transactions += 1;
        } else {
          map.set(item.itemId, {
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            revenue: item.totalPrice,
            transactions: 1
          });
        }
      }
    }
    
    return map;
  };

  // Single-pass aggregation for daily/monthly item sales data (for 3m+)
  const aggregateItemData = (items: (DailyItemSales | MonthlyItemSales)[]): Map<number, AggregatedItemData> => {
    const map = new Map<number, AggregatedItemData>();
    
    for (const item of items) {
      const existing = map.get(item.itemId);
      if (existing) {
        existing.quantity += item.totalQuantity;
        existing.revenue += item.totalRevenue;
        existing.transactions += item.transactionCount;
      } else {
        map.set(item.itemId, {
          name: item.itemName,
          sku: item.sku,
          quantity: item.totalQuantity,
          revenue: item.totalRevenue,
          transactions: item.transactionCount
        });
      }
    }
    
    return map;
  };

  // Format business date from Date object
  const formatBusinessDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Get year-month from Date object
  const getYearMonth = (date: Date): string => {
    return date.toISOString().split("T")[0].substring(0, 7);
  };

  const loadItemsReport = async () => {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      let startDate: Date;
      let useTransactions = false; // For 1d, 7d, 1m - query transactions directly
      let useMonthly = false; // For 3m+ - use monthly summaries

      switch (itemsTimeRange) {
        case "1d":
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
          useTransactions = true;
          break;
        case "7d":
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          useTransactions = true;
          break;
        case "1m":
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 29);
          startDate.setHours(0, 0, 0, 0);
          useTransactions = true;
          break;
        case "3m":
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 3);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "6m":
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 6);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "1y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 1);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "3y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 3);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "5y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 5);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        default:
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          useTransactions = true;
      }

      const startDateStr = formatBusinessDate(startDate);
      const endDateStr = formatBusinessDate(today);
      const startMonth = getYearMonth(startDate);
      const currentMonth = getYearMonth(today);

      let itemMap: Map<number, AggregatedItemData>;

      if (useTransactions) {
        // 1d, 7d, 1m - Query directly from transactions table
        // This ensures accurate data even after daily rollups are cleared
        const allTransactions = await db.getAll<Transaction>("transactions");
        const filtered = allTransactions.filter(t => 
          t.businessDate >= startDateStr && t.businessDate <= endDateStr
        );
        
        itemMap = aggregateItemsFromTransactions(filtered);

      } else if (useMonthly) {
        // 3m+ - Use monthly summaries + current month from transactions
        const [allMonthly, allTransactions] = await Promise.all([
          db.getAll<MonthlyItemSales>("monthlyItemSales"),
          db.getAll<Transaction>("transactions")
        ]);

        // Filter monthly data (exclude current month - will use transactions)
        const filteredMonthly = allMonthly.filter(m => 
          m.yearMonth >= startMonth && m.yearMonth < currentMonth
        );

        // Filter current month transactions
        const currentMonthTransactions = allTransactions.filter(t => 
          t.businessDate.startsWith(currentMonth)
        );

        // Aggregate monthly data
        itemMap = aggregateItemData(filteredMonthly);

        // Add current month from transactions
        for (const txn of currentMonthTransactions) {
          for (const item of txn.items) {
            const existing = itemMap.get(item.itemId);
            if (existing) {
              existing.quantity += item.quantity;
              existing.revenue += item.totalPrice;
              existing.transactions += 1;
            } else {
              itemMap.set(item.itemId, {
                name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                revenue: item.totalPrice,
                transactions: 1
              });
            }
          }
        }

      } else {
        // Fallback - should not reach here
        itemMap = new Map();
      }

      // Convert to array and sort once (single sort operation)
      const allItems = Array.from(itemMap.values());
      const sorted = allItems.sort((a, b) => 
        sortBy === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue
      );
      
      // Take top N
      const topNItems = sorted.slice(0, itemTopN);

      // Generate smooth spectrum colors
      const chartResult = topNItems.map((item, idx) => ({
        itemName: item.name,
        quantity: item.quantity,
        revenue: item.revenue,
        color: generateSpectrumColor(idx, topNItems.length)
      }));
      
      setTopItems(chartResult);

      // Prepare table data
      const tableData = topNItems.map((item, idx) => ({
        name: item.name,
        value: item.quantity,
        revenue: item.revenue,
        transactionCount: item.transactions,
        color: generateSpectrumColor(idx, topNItems.length)
      }));
      setTopItemsData(tableData);

    } catch (error) {
      console.error("Error loading items report:", error);
      setTopItems([]);
      setTopItemsData([]);
    }
  };

  const barChartData = topItems.map(item => ({
    name: item.itemName,
    value: sortBy === "quantity" ? item.quantity : item.revenue,
    revenue: item.revenue,
    quantity: item.quantity,
    color: item.color
  }));

  const pieChartData = topItems.map(item => ({
    name: item.itemName,
    value: sortBy === "quantity" ? item.quantity : item.revenue,
    color: item.color
  }));

  // Pre-calculate table totals
  const tableTotals = topItemsData.length > 0 ? {
    quantity: topItemsData.reduce((sum, item) => sum + item.value, 0),
    revenue: topItemsData.reduce((sum, item) => sum + item.revenue, 0),
    transactions: topItemsData.reduce((sum, item) => sum + item.transactionCount, 0),
    avgQty: 0
  } : { quantity: 0, revenue: 0, transactions: 0, avgQty: 0 };

  if (tableTotals.transactions > 0) {
    tableTotals.avgQty = tableTotals.quantity / tableTotals.transactions;
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="space-y-4 bg-white dark:bg-slate-950 p-4 rounded-none md:rounded-lg shadow-sm">
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <div className="relative">
              <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
                <div className="flex gap-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded p-0.5 shadow-sm">
                  <Button
                    variant={chartView === "bar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartView("bar")}
                    className="h-5 px-1.5 text-[9px]"
                  >
                    Bar
                  </Button>
                  <Button
                    variant={chartView === "pie" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartView("pie")}
                    className="h-5 px-1.5 text-[9px]"
                  >
                    Pie
                  </Button>
                </div>

                <div className="flex gap-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded p-0.5 shadow-sm">
                  <Button
                    variant={sortBy === "quantity" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy("quantity")}
                    className="h-5 px-1.5 text-[9px]"
                  >
                    Qty
                  </Button>
                  <Button
                    variant={sortBy === "revenue" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy("revenue")}
                    className="h-5 px-1.5 text-[9px]"
                  >
                    $$
                  </Button>
                </div>

                <div className="flex gap-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded p-0.5 shadow-sm">
                  <Button
                    variant={itemTopN === 10 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setItemTopN(10)}
                    className="h-5 px-1.5 text-[9px]"
                  >
                    10
                  </Button>
                  <Button
                    variant={itemTopN === 20 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setItemTopN(20)}
                    className="h-5 px-1.5 text-[9px]"
                  >
                    20
                  </Button>
                </div>
              </div>

              <div className="pb-12">
                <h4 className="text-[10px] font-medium mb-2">
                  {sortBy === "quantity" ? t.reports.topItemsByQuantity : t.reports.topItemsByRevenue}
                </h4>
                <div className={chartView === "pie" ? "h-[300px]" : "h-[360px]"}>
                  {chartView === "bar" ? (
                    <HorizontalBarChart data={barChartData} />
                  ) : (
                    <PieChart data={pieChartData} />
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-0.5 pt-3 border-t flex-wrap relative z-20">
                {(["1d", "7d", "1m", "3m", "6m", "1y", "3y", "5y"] as ItemsTimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={itemsTimeRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setItemsTimeRange(range)}
                    className="h-6 px-2 text-[10px] uppercase"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-slate-950 p-4 rounded-none md:rounded-lg shadow-sm">
        <Card className="border-0 shadow-none">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              {translate("reports.items.table", language as Language)} ({topItemsData.length} Items)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topItemsData.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="w-8 text-[10px] font-medium py-1 px-2">#</TableHead>
                        <TableHead className="text-[10px] font-medium py-1 px-2 min-w-[100px]">Item</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2">Qty</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2">Rev</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2">Tx</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2">Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topItemsData.map((item, idx) => (
                        <TableRow key={idx} className="border-b hover:bg-muted/50">
                          <TableCell className="text-[10px] font-medium py-1 px-2">{idx + 1}</TableCell>
                          <TableCell className="text-[10px] py-1 px-2 truncate max-w-[150px]">{item.name}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2">{item.value}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(item.revenue)}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2">{item.transactionCount}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2">{(item.value / item.transactionCount).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="text-[10px] font-bold py-1 px-2">Total</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2">{tableTotals.quantity}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(tableTotals.revenue)}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2">{tableTotals.transactions}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2">
                          {tableTotals.avgQty.toFixed(1)}
                        </TableCell>
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