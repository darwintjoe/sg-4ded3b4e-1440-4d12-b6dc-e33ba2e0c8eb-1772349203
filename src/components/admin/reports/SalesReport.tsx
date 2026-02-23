import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DailyPaymentSales, MonthlySalesSummary } from "@/types";
import { db } from "@/lib/db";
import { Download, DollarSign, Receipt, TrendingUp, FileImage } from "lucide-react";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDateRange, formatBusinessDate, getYearMonth } from "@/lib/dateRangeUtils";
import { exportChartAsPDF, exportChartAsImage } from "@/lib/reportExportUtils";
import type { TimeRange } from "@/lib/dateRangeUtils";

type SalesTimeRange = "MTD" | "30D" | "YTD" | "12M" | "5Y";

interface SalesReportProps {
  language: string;
}

interface AggregatedSalesData {
  key: string;
  fullDate: string;
  revenue: number;
  receipts: number;
  cash: number;
  qrisStatic: number;
  qrisDynamic: number;
  voucher: number;
}

export function SalesReport({ language }: SalesReportProps) {
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
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadSalesReport();
  }, [salesTimeRange]);

  // Single-pass aggregation helper
  const aggregateDailyData = (daily: DailyPaymentSales[]): Map<string, AggregatedSalesData> => {
    const map = new Map<string, AggregatedSalesData>();
    
    for (const d of daily) {
      const existing = map.get(d.businessDate);
      if (existing) {
        existing.revenue += d.totalAmount;
        existing.receipts += d.transactionCount;
        if (d.method === "cash") existing.cash += d.totalAmount;
        else if (d.method === "qris-static") existing.qrisStatic += d.totalAmount;
        else if (d.method === "qris-dynamic") existing.qrisDynamic += d.totalAmount;
        else if (d.method === "voucher") existing.voucher += d.totalAmount;
      } else {
        map.set(d.businessDate, {
          key: d.businessDate.substring(5),
          fullDate: d.businessDate,
          revenue: d.totalAmount,
          receipts: d.transactionCount,
          cash: d.method === "cash" ? d.totalAmount : 0,
          qrisStatic: d.method === "qris-static" ? d.totalAmount : 0,
          qrisDynamic: d.method === "qris-dynamic" ? d.totalAmount : 0,
          voucher: d.method === "voucher" ? d.totalAmount : 0
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
        cash: m.cashAmount,
        qrisStatic: m.qrisStaticAmount,
        qrisDynamic: m.qrisDynamicAmount,
        voucher: m.voucherAmount
      });
    }
    
    return map;
  };

  // Single-pass yearly aggregation from monthly data
  const aggregateYearlyData = (monthly: MonthlySalesSummary[]): Map<string, AggregatedSalesData> => {
    const map = new Map<string, AggregatedSalesData>();
    
    for (const m of monthly) {
      const year = m.yearMonth.substring(0, 4);
      const existing = map.get(year);
      
      if (existing) {
        existing.revenue += m.totalRevenue;
        existing.receipts += m.totalReceipts;
        existing.cash += m.cashAmount;
        existing.qrisStatic += m.qrisStaticAmount;
        existing.qrisDynamic += m.qrisDynamicAmount;
        existing.voucher += m.voucherAmount;
      } else {
        map.set(year, {
          key: year,
          fullDate: year,
          revenue: m.totalRevenue,
          receipts: m.totalReceipts,
          cash: m.cashAmount,
          qrisStatic: m.qrisStaticAmount,
          qrisDynamic: m.qrisDynamicAmount,
          voucher: m.voucherAmount
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
        // YTD, 12M, 5Y - Use monthly summary + current month from daily
        const startMonth = getYearMonth(startDate);
        const endMonth = getYearMonth(endDate);

        // Batch fetch all data upfront
        const [allMonthly, allDaily] = await Promise.all([
          db.getAll<MonthlySalesSummary>("monthlySalesSummary"),
          db.getAll<DailyPaymentSales>("dailyPaymentSales")
        ]);

        // Filter in single pass
        const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);
        const currentDaily = allDaily.filter(d => d.businessDate.startsWith(currentMonth));

        // Aggregate monthly data
        const dataMap = aggregateMonthlyData(filteredMonthly);

        // Add current month daily data if needed
        if (endMonth >= currentMonth && currentDaily.length > 0) {
          const currentMonthData: AggregatedSalesData = {
            key: currentMonth.substring(5, 7),
            fullDate: currentMonth,
            revenue: 0,
            receipts: 0,
            cash: 0,
            qrisStatic: 0,
            qrisDynamic: 0,
            voucher: 0
          };

          for (const d of currentDaily) {
            currentMonthData.revenue += d.totalAmount;
            currentMonthData.receipts += d.transactionCount;
            if (d.method === "cash") currentMonthData.cash += d.totalAmount;
            else if (d.method === "qris-static") currentMonthData.qrisStatic += d.totalAmount;
            else if (d.method === "qris-dynamic") currentMonthData.qrisDynamic += d.totalAmount;
            else if (d.method === "voucher") currentMonthData.voucher += d.totalAmount;
          }

          dataMap.set(currentMonth, currentMonthData);
        }

        // Convert to array and sort once
        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

        // Handle 5Y - aggregate by year
        if (salesTimeRange === "5Y") {
          const yearlyMap = aggregateYearlyData([...filteredMonthly, ...(endMonth >= currentMonth ? [{
            yearMonth: currentMonth,
            totalRevenue: sortedData.find(d => d.fullDate === currentMonth)?.revenue || 0,
            totalReceipts: sortedData.find(d => d.fullDate === currentMonth)?.receipts || 0,
            cashAmount: sortedData.find(d => d.fullDate === currentMonth)?.cash || 0,
            qrisStaticAmount: sortedData.find(d => d.fullDate === currentMonth)?.qrisStatic || 0,
            qrisDynamicAmount: sortedData.find(d => d.fullDate === currentMonth)?.qrisDynamic || 0,
            voucherAmount: sortedData.find(d => d.fullDate === currentMonth)?.voucher || 0
          }] : [])]);

          const yearlyData = Array.from(yearlyMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

          // Prepare chart data
          const chartData = yearlyData.map(d => ({
            name: d.key,
            fullDate: d.fullDate,
            cash: d.cash,
            qrisStatic: d.qrisStatic,
            qrisDynamic: d.qrisDynamic,
            voucher: d.voucher
          }));

          setSalesChartData(chartData);
          setSalesData(yearlyData.slice().sort((a, b) => b.fullDate.localeCompare(a.fullDate)));
          setSalesStats(calculateTotals(yearlyData));
        } else {
          // YTD, 12M - show individual months
          const chartData = sortedData.map(d => ({
            name: d.key,
            fullDate: d.fullDate,
            cash: d.cash,
            qrisStatic: d.qrisStatic,
            qrisDynamic: d.qrisDynamic,
            voucher: d.voucher
          }));

          setSalesChartData(chartData);
          setSalesData(sortedData.slice().sort((a, b) => b.fullDate.localeCompare(a.fullDate)));
          setSalesStats(calculateTotals(sortedData));
        }

      } else {
        // MTD, 30D - Use daily data only
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDateStr && d.businessDate <= endDateStr);
        
        // Single-pass aggregation
        const dataMap = aggregateDailyData(filtered);
        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

        // Prepare chart data
        const chartData = sortedData.map(d => ({
          name: d.key,
          fullDate: d.fullDate,
          cash: d.cash,
          qrisStatic: d.qrisStatic,
          qrisDynamic: d.qrisDynamic,
          voucher: d.voucher
        }));

        setSalesChartData(chartData);
        setSalesData(sortedData.slice().sort((a, b) => b.fullDate.localeCompare(a.fullDate)));
        setSalesStats(calculateTotals(sortedData));
      }
    } catch (error) {
      console.error("Error loading sales report:", error);
      setSalesChartData([]);
      setSalesData([]);
      setSalesStats({ totalRevenue: 0, totalReceipts: 0, avgTransaction: 0 });
    }
  };

  const exportSalesAsPDF = async () => {
    if (!salesChartRef.current || !salesTableRef.current) return;
    
    setIsExporting(true);
    const result = await exportChartAsPDF(
      salesChartRef.current,
      salesTableRef.current,
      {
        filename: `sales-report-${new Date().toISOString().split('T')[0]}`,
        title: t.reports.salesReport,
        includeTimestamp: true,
        pageOrientation: "portrait"
      }
    );
    
    if (!result.success) {
      alert(`Export failed: ${result.error}`);
    }
    setIsExporting(false);
  };

  const exportSalesAsImage = async () => {
    if (!salesChartRef.current || !salesTableRef.current) return;
    
    setIsExporting(true);
    const result = await exportChartAsImage(
      salesChartRef.current,
      salesTableRef.current,
      {
        filename: `sales-report-${new Date().toISOString().split('T')[0]}`
      }
    );
    
    if (!result.success) {
      alert(`Export failed: ${result.error}`);
    }
    setIsExporting(false);
  };

  const isSalesMonthlyView = ["YTD", "12M", "5Y"].includes(salesTimeRange);

  // Pre-calculate table totals (memoized in render)
  const tableTotals = {
    revenue: salesData.reduce((sum, row) => sum + row.revenue, 0),
    receipts: salesData.reduce((sum, row) => sum + row.receipts, 0),
    cash: salesData.reduce((sum, row) => sum + row.cash, 0),
    qrisStatic: salesData.reduce((sum, row) => sum + row.qrisStatic, 0),
    qrisDynamic: salesData.reduce((sum, row) => sum + row.qrisDynamic, 0),
    voucher: salesData.reduce((sum, row) => sum + row.voucher, 0)
  };

  return (
    <div className="space-y-4">
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
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">Cash</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">QR-S</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">QR-D</TableHead>
                        <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">Vchr</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.map((row, idx) => (
                        <TableRow key={idx} className="border-b hover:bg-muted/50">
                          <TableCell className="text-[10px] font-medium py-1 px-2 whitespace-nowrap">{row.fullDate}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2">{row.receipts}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.cash)}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.qrisStatic)}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.qrisDynamic)}</TableCell>
                          <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.voucher)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50">
                        <TableCell className="text-[10px] font-bold py-1 px-2">Total</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(tableTotals.revenue)}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2">{tableTotals.receipts}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(tableTotals.cash)}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(tableTotals.qrisStatic)}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(tableTotals.qrisDynamic)}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(tableTotals.voucher)}</TableCell>
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