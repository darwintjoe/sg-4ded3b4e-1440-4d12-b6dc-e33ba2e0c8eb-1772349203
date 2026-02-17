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
  const [salesData, setSalesData] = useState<any[]>([]);
  const [salesDateRange, setSalesDateRange] = useState<string>("");
  const [salesPeriodLabel, setSalesPeriodLabel] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadSalesReport();
  }, [salesTimeRange]);

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

        // Get all monthly summary data
        const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
        const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);

        // Get current month data from daily if needed
        let currentMonthData = null;
        if (endMonth >= currentMonth) {
          const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
          const currentDaily = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
          
          if (currentDaily.length > 0) {
            currentMonthData = {
              yearMonth: currentMonth,
              totalRevenue: 0,
              totalReceipts: 0,
              cashAmount: 0,
              qrisStaticAmount: 0,
              qrisDynamicAmount: 0,
              voucherAmount: 0
            };

            currentDaily.forEach(d => {
              currentMonthData!.totalRevenue += d.totalAmount;
              currentMonthData!.totalReceipts += d.transactionCount;
              if (d.method === "cash") currentMonthData!.cashAmount += d.totalAmount;
              else if (d.method === "qris-static") currentMonthData!.qrisStaticAmount += d.totalAmount;
              else if (d.method === "qris-dynamic") currentMonthData!.qrisDynamicAmount += d.totalAmount;
              else if (d.method === "voucher") currentMonthData!.voucherAmount += d.totalAmount;
            });
          }
        }

        // Combine monthly + current month data
        const combinedData = [...filteredMonthly];
        if (currentMonthData) {
          combinedData.push(currentMonthData as MonthlySalesSummary);
        }

        combinedData.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

        // Handle 5Y - aggregate by year (max 5 bars)
        if (salesTimeRange === "5Y") {
          const yearlyMap = new Map<string, any>();
          
          combinedData.forEach(m => {
            const year = m.yearMonth.substring(0, 4);
            const existing = yearlyMap.get(year) || { 
              name: year, 
              cash: 0, 
              "qris-static": 0, 
              "qris-dynamic": 0, 
              voucher: 0, 
              receipts: 0, 
              revenue: 0 
            };
            
            existing.cash += m.cashAmount;
            existing["qris-static"] += m.qrisStaticAmount;
            existing["qris-dynamic"] += m.qrisDynamicAmount;
            existing.voucher += m.voucherAmount;
            existing.receipts += m.totalReceipts;
            existing.revenue += m.totalRevenue;
            
            yearlyMap.set(year, existing);
          });
          
          const chartData = Array.from(yearlyMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          setSalesChartData(chartData);
          
          const tableData = chartData.map(d => ({
            date: d.name,
            revenue: d.revenue,
            receipts: d.receipts,
            cash: d.cash,
            qrisStatic: d["qris-static"],
            qrisDynamic: d["qris-dynamic"],
            voucher: d.voucher
          })).sort((a, b) => b.date.localeCompare(a.date));
          
          setSalesData(tableData);
        } else {
          // YTD, 12M - show individual months
          const chartData = combinedData.map(m => ({
            name: m.yearMonth.substring(5, 7),
            fullDate: m.yearMonth,
            cash: m.cashAmount,
            "qris-static": m.qrisStaticAmount,
            "qris-dynamic": m.qrisDynamicAmount,
            voucher: m.voucherAmount
          }));
          setSalesChartData(chartData);
          
          const tableData = combinedData.map(m => ({
            date: m.yearMonth,
            revenue: m.totalRevenue,
            receipts: m.totalReceipts,
            cash: m.cashAmount,
            qrisStatic: m.qrisStaticAmount,
            qrisDynamic: m.qrisDynamicAmount,
            voucher: m.voucherAmount
          })).sort((a, b) => b.date.localeCompare(a.date));
          
          setSalesData(tableData);
        }

        // Calculate totals
        let totalRevenue = 0;
        let totalReceipts = 0;
        combinedData.forEach(d => {
          totalRevenue += d.totalRevenue;
          totalReceipts += d.totalReceipts;
        });

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
        });

      } else {
        // MTD, 30D - Use daily data only
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDateStr && d.businessDate <= endDateStr);
        
        // Group by date
        const dateMap = new Map<string, any>();
        
        filtered.forEach(d => {
          const existing = dateMap.get(d.businessDate) || {
            name: d.businessDate.substring(5),
            fullDate: d.businessDate,
            cash: 0,
            "qris-static": 0,
            "qris-dynamic": 0,
            voucher: 0,
            receipts: 0,
            revenue: 0
          };
          
          existing.revenue += d.totalAmount;
          existing.receipts += d.transactionCount;
          if (d.method === "cash") existing.cash += d.totalAmount;
          else if (d.method === "qris-static") existing["qris-static"] += d.totalAmount;
          else if (d.method === "qris-dynamic") existing["qris-dynamic"] += d.totalAmount;
          else if (d.method === "voucher") existing.voucher += d.totalAmount;
          
          dateMap.set(d.businessDate, existing);
        });
        
        const chartData = Array.from(dateMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
        setSalesChartData(chartData);
        
        const tableData = chartData.map(d => ({
          date: d.fullDate,
          revenue: d.revenue,
          receipts: d.receipts,
          cash: d.cash,
          qrisStatic: d["qris-static"],
          qrisDynamic: d["qris-dynamic"],
          voucher: d.voucher
        })).sort((a, b) => b.date.localeCompare(a.date));
        
        setSalesData(tableData);
        
        // Calculate totals
        const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
        const totalReceipts = chartData.reduce((sum, d) => sum + d.receipts, 0);
        
        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
        });
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

      <div className="flex justify-center gap-2">
        <Button 
          onClick={exportSalesAsPDF} 
          variant="outline" 
          size="sm"
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? t.reports.exporting : t.reports.exportPDF}
        </Button>
        <Button 
          onClick={exportSalesAsImage} 
          variant="outline" 
          size="sm"
          disabled={isExporting}
        >
          <FileImage className="h-4 w-4 mr-2" />
          {isExporting ? t.reports.exporting : t.reports.exportImage}
        </Button>
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
                          <TableCell className="text-[10px] font-medium py-1 px-2 whitespace-nowrap">{row.date}</TableCell>
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
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.revenue, 0))}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2">{salesData.reduce((sum, row) => sum + row.receipts, 0)}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.cash, 0))}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.qrisStatic, 0))}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.qrisDynamic, 0))}</TableCell>
                        <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.voucher, 0))}</TableCell>
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