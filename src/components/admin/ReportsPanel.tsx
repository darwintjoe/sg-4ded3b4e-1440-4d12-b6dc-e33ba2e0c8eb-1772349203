import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { DailyItemSales, DailyPaymentSales, DailyAttendance, MonthlyItemSales, MonthlySalesSummary } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { Download, Printer, Table2, TrendingUp, DollarSign, Receipt, FileImage, Banknote } from "lucide-react";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { PieChart } from "@/components/charts/PieChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type SalesTimeRange = "mtd" | "30d" | "ytd" | "12m" | "5y";
type ItemsTimeRange = "1d" | "7d" | "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
type AttendanceTimeRange = "mtd" | "ytd";
type ChartView = "bar" | "pie";
type SortBy = "quantity" | "revenue";

export function ReportsPanel() {
  const { language } = useApp();
  const locale = language === "id" ? "id-ID" : "en-US";
  const salesChartRef = useRef<HTMLDivElement>(null);
  const salesTableRef = useRef<HTMLDivElement>(null);
  const itemsChartRef = useRef<HTMLDivElement>(null);
  const itemsTableRef = useRef<HTMLDivElement>(null);

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
    common: {
      cash: "Cash",
      qrisStatic: "QRIS Static",
      qrisDynamic: "QRIS Dynamic",
      voucher: "Voucher",
    },
    reports: {
      salesReport: "Sales Report",
      dailySalesData: "Daily Sales Data",
      monthlySalesData: "Monthly Sales Data",
      topItemsData: "Top Items Data",
      noData: "No data available for the selected period",
      date: "Date",
      month: "Month",
      year: "Year",
      revenue: "Revenue",
      receipts: "Receipts",
      total: "Total",
      items: "Items",
      itemName: "Item Name",
      quantity: "Quantity",
      transactions: "Transactions",
      avgPerTransaction: "Avg/Tx",
      totalRevenue: "Total Revenue",
      totalReceipts: "Total Receipts",
      avgTransaction: "Avg Transaction",
      cashSales: "Cash Sales",
      paymentBreakdown: "Payment Breakdown",
      topItemsByQuantity: "Top Items by Quantity",
      topItemsByRevenue: "Top Items by Revenue",
      exportPDF: "Export PDF",
      exportImage: "Export Image",
      exporting: "Exporting...",
    }
  };

  const [salesTimeRange, setSalesTimeRange] = useState<SalesTimeRange>("mtd");
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [salesStats, setSalesStats] = useState({
    totalRevenue: 0,
    totalReceipts: 0,
    avgTransaction: 0,
    cashSales: 0
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [salesDateRange, setSalesDateRange] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const [itemsTimeRange, setItemsTimeRange] = useState<ItemsTimeRange>("1m");
  const [itemTopN, setItemTopN] = useState<10 | 20>(10);
  const [chartView, setChartView] = useState<ChartView>("bar");
  const [sortBy, setSortBy] = useState<SortBy>("quantity");
  const [topItems, setTopItems] = useState<Array<{
    itemName: string;
    quantity: number;
    revenue: number;
  }>>([]);
  const [topItemsData, setTopItemsData] = useState<any[]>([]);

  const [attendanceTimeRange, setAttendanceTimeRange] = useState<AttendanceTimeRange>("mtd");
  const [attendanceData, setAttendanceData] = useState<Array<{
    employeeName: string;
    totalHours: number;
    daysWorked: number;
    lateCount: number;
  }>>([]);

  const isSalesMonthlyView = ["ytd", "12m", "5y"].includes(salesTimeRange);

  useEffect(() => {
    loadSalesReport();
  }, [salesTimeRange]);

  useEffect(() => {
    loadItemsReport();
  }, [itemsTimeRange, itemTopN, sortBy]);

  useEffect(() => {
    loadAttendanceReport();
  }, [attendanceTimeRange]);

  const getSalesDateRange = (): { startDate: string; endDate: string; useMonthly: boolean; displayRange: string } => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    if (salesTimeRange === "mtd") {
      const monthStart = todayStr.substring(0, 8) + "01";
      const displayRange = `${monthStart} - ${todayStr}`;
      return { startDate: monthStart, endDate: todayStr, useMonthly: false, displayRange };
    } else if (salesTimeRange === "30d") {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const displayRange = `${startDate} - ${todayStr}`;
      return { startDate, endDate: todayStr, useMonthly: false, displayRange };
    } else if (salesTimeRange === "ytd") {
      const yearStart = todayStr.substring(0, 4) + "-01-01";
      const displayRange = `${yearStart} - ${todayStr}`;
      return { startDate: yearStart, endDate: todayStr, useMonthly: true, displayRange };
    } else if (salesTimeRange === "12m") {
      const twelveMonthsAgo = new Date(today);
      twelveMonthsAgo.setMonth(today.getMonth() - 11);
      const startDate = twelveMonthsAgo.toISOString().split("T")[0].substring(0, 7) + "-01";
      const displayRange = `${startDate.substring(0, 7)} - ${todayStr.substring(0, 7)}`;
      return { startDate, endDate: todayStr, useMonthly: true, displayRange };
    } else {
      const fiveYearsAgo = new Date(today);
      fiveYearsAgo.setFullYear(today.getFullYear() - 4);
      const startDate = fiveYearsAgo.toISOString().split("T")[0].substring(0, 4) + "-01-01";
      const displayRange = `${startDate.substring(0, 4)} - ${todayStr.substring(0, 4)}`;
      return { startDate, endDate: todayStr, useMonthly: true, displayRange };
    }
  };

  const loadSalesReport = async () => {
    try {
      const { startDate, endDate, useMonthly, displayRange } = getSalesDateRange();
      setSalesDateRange(displayRange);

      if (useMonthly) {
        // YTD, 12M, 5Y - Use monthly summary + current month from daily
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        const currentMonth = new Date().toISOString().substring(0, 7);

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

        // Handle 5Y - aggregate by year
        if (salesTimeRange === "5y") {
          const yearlyMap = new Map<string, any>();
          
          combinedData.forEach(m => {
            const year = m.yearMonth.substring(0, 4);
            const existing = yearlyMap.get(year) || { 
              name: year, 
              cash: 0, 
              qrisStatic: 0, 
              qrisDynamic: 0, 
              voucher: 0, 
              receipts: 0, 
              revenue: 0 
            };
            
            existing.cash += m.cashAmount;
            existing.qrisStatic += m.qrisStaticAmount;
            existing.qrisDynamic += m.qrisDynamicAmount;
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
            qrisStatic: d.qrisStatic,
            qrisDynamic: d.qrisDynamic,
            voucher: d.voucher
          })).sort((a, b) => b.date.localeCompare(a.date));
          
          setSalesData(tableData);
        } else {
          // YTD, 12M - show individual months (no aggregation)
          const chartData = combinedData.map(m => ({
            name: m.yearMonth.substring(5, 7),
            fullDate: m.yearMonth,
            cash: m.cashAmount,
            qrisStatic: m.qrisStaticAmount,
            qrisDynamic: m.qrisDynamicAmount,
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
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0,
          cashSales: combinedData.reduce((sum, d) => sum + d.cashAmount, 0)
        });

      } else {
        // MTD, 30D - Use daily data
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDate && d.businessDate <= endDate);
        
        // Group by date
        const dateMap = new Map<string, any>();
        
        filtered.forEach(d => {
          const existing = dateMap.get(d.businessDate) || {
            name: d.businessDate.substring(5),
            fullDate: d.businessDate,
            cash: 0,
            qrisStatic: 0,
            qrisDynamic: 0,
            voucher: 0,
            receipts: 0,
            revenue: 0
          };
          
          existing.revenue += d.totalAmount;
          existing.receipts += d.transactionCount;
          if (d.method === "cash") existing.cash += d.totalAmount;
          else if (d.method === "qris-static") existing.qrisStatic += d.totalAmount;
          else if (d.method === "qris-dynamic") existing.qrisDynamic += d.totalAmount;
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
          qrisStatic: d.qrisStatic,
          qrisDynamic: d.qrisDynamic,
          voucher: d.voucher
        })).sort((a, b) => b.date.localeCompare(a.date));
        
        setSalesData(tableData);
        
        // Calculate totals
        const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
        const totalReceipts = chartData.reduce((sum, d) => sum + d.receipts, 0);
        
        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0,
          cashSales: chartData.reduce((sum, d) => sum + d.cash, 0)
        });
      }
    } catch (error) {
      console.error("Error loading sales report:", error);
      setSalesChartData([]);
      setSalesData([]);
      setSalesStats({ totalRevenue: 0, totalReceipts: 0, avgTransaction: 0 });
    }
  };

  const loadItemsReport = async () => {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      let startDate: Date;
      let useMonthly = false;

      switch (itemsTimeRange) {
        case "1d":
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "7d":
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "1m":
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 29);
          startDate.setHours(0, 0, 0, 0);
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
      }

      const itemMap = new Map<number, { name: string; quantity: number; revenue: number; transactions: number }>();

      if (useMonthly) {
        const startMonth = startDate.toISOString().split('T')[0].substring(0, 7);
        const currentMonth = today.toISOString().split('T')[0].substring(0, 7);
        
        const allMonthly = await db.getAll<MonthlyItemSales>("monthlyItemSales");
        const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);
        
        filteredMonthly.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });

        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        const currentDaily = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
        
        currentDaily.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });

      } else {
        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = today.toISOString().split('T')[0];
        
        const filtered = allDaily.filter(d => d.businessDate >= startDateStr && d.businessDate <= endDateStr);
        
        filtered.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });
      }

      const allItems = Array.from(itemMap.values());
      
      const sorted = allItems.sort((a, b) => 
        sortBy === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue
      );
      
      const topNItems = sorted.slice(0, itemTopN);
      
      const chartResult = topNItems.map(item => ({
        itemName: item.name,
        quantity: item.quantity,
        revenue: item.revenue
      }));
      
      setTopItems(chartResult);

      const tableData = topNItems.map(item => ({
        name: item.name,
        value: item.quantity,
        revenue: item.revenue,
        transactionCount: item.transactions
      }));
      setTopItemsData(tableData);

    } catch (error) {
      console.error("Error loading items report:", error);
    }
  };

  const loadAttendanceReport = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const startDate = attendanceTimeRange === "mtd" 
        ? today.substring(0, 8) + "01"
        : today.substring(0, 4) + "-01-01";

      const allDaily = await db.getAll<DailyAttendance>("dailyAttendance");
      const filtered = allDaily.filter(d => d.date >= startDate && d.date <= today);
      
      const employeeMap = new Map<number, { name: string; hours: number; days: number; late: number }>();
      
      filtered.forEach(record => {
        const existing = employeeMap.get(record.employeeId) || { 
          name: record.employeeName, 
          hours: 0, 
          days: 0, 
          late: 0 
        };
        existing.hours += record.hoursWorked;
        existing.days += 1;
        if (record.isLate) existing.late += 1;
        employeeMap.set(record.employeeId, existing);
      });
      
      const data = Array.from(employeeMap.values()).map(e => ({
        employeeName: e.name,
        totalHours: e.hours,
        daysWorked: e.days,
        lateCount: e.late
      }));
      
      setAttendanceData(data);
    } catch (error) {
      console.error("Error loading attendance report:", error);
    }
  };

  const exportToCSV = () => {
    let csv = "SELL MORE - Report Export\n";
    csv += `Generated: ${new Date().toISOString()}\n\n`;
    
    csv += "=== SALES DATA ===\n";
    csv += `Total Revenue: Rp ${salesStats.totalRevenue.toLocaleString("id-ID")}\n`;
    csv += `Total Receipts: ${salesStats.totalReceipts}\n\n`;
    
    csv += "=== TOP ITEMS ===\n";
    topItems.forEach((item, idx) => {
      csv += `${idx + 1}. ${item.itemName}: ${item.quantity} units, Rp ${item.revenue.toLocaleString("id-ID")}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSalesAsPDF = async () => {
    if (!salesChartRef.current || !salesTableRef.current) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      const chartCanvas = await html2canvas(salesChartRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const chartImgData = chartCanvas.toDataURL('image/png');
      const chartWidth = pageWidth - (2 * margin);
      const chartHeight = (chartCanvas.height * chartWidth) / chartCanvas.width;
      
      pdf.addImage(chartImgData, 'PNG', margin, margin, chartWidth, chartHeight);
      
      pdf.addPage();
      
      const tableCanvas = await html2canvas(salesTableRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const tableImgData = tableCanvas.toDataURL('image/png');
      
      const tableWidth = pageWidth - (2 * margin);
      const tableHeight = (tableCanvas.height * tableWidth) / tableCanvas.width;
      
      let yPosition = margin;
      const maxHeightPerPage = pageHeight - (2 * margin);
      
      if (tableHeight <= maxHeightPerPage) {
        pdf.addImage(tableImgData, 'PNG', margin, yPosition, tableWidth, tableHeight);
      } else {
        const totalPages = Math.ceil(tableHeight / maxHeightPerPage);
        
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
            yPosition = margin;
          }
          
          const sourceY = i * maxHeightPerPage * (tableCanvas.height / tableHeight);
          const sourceHeight = Math.min(
            maxHeightPerPage * (tableCanvas.height / tableHeight),
            tableCanvas.height - sourceY
          );
          
          const pageTableHeight = (sourceHeight * tableWidth) / tableCanvas.width;
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = tableCanvas.width;
          tempCanvas.height = sourceHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.drawImage(
              tableCanvas,
              0, sourceY, tableCanvas.width, sourceHeight,
              0, 0, tableCanvas.width, sourceHeight
            );
            
            const tempImgData = tempCanvas.toDataURL('image/png');
            pdf.addImage(tempImgData, 'PNG', margin, yPosition, tableWidth, pageTableHeight);
          }
        }
      }
      
      pdf.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportSalesAsImage = async () => {
    if (!salesChartRef.current || !salesTableRef.current) return;
    
    setIsExporting(true);
    try {
      const container = document.createElement('div');
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '20px';
      
      const chartClone = salesChartRef.current.cloneNode(true) as HTMLElement;
      const tableClone = salesTableRef.current.cloneNode(true) as HTMLElement;
      
      container.appendChild(chartClone);
      container.appendChild(tableClone);
      document.body.appendChild(container);
      
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      document.body.removeChild(container);
      
      const link = document.createElement('a');
      link.download = `sales-report-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Failed to export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportItemsAsPDF = async () => {
    if (!itemsChartRef.current || !itemsTableRef.current) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      const chartCanvas = await html2canvas(itemsChartRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const chartImgData = chartCanvas.toDataURL('image/png');
      const chartWidth = pageWidth - (2 * margin);
      const chartHeight = (chartCanvas.height * chartWidth) / chartCanvas.width;
      
      pdf.addImage(chartImgData, 'PNG', margin, margin, chartWidth, chartHeight);
      
      pdf.addPage();
      
      const tableCanvas = await html2canvas(itemsTableRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const tableImgData = tableCanvas.toDataURL('image/png');
      const tableWidth = pageWidth - (2 * margin);
      const tableHeight = (tableCanvas.height * tableWidth) / tableCanvas.width;
      
      let yPosition = margin;
      const maxHeightPerPage = pageHeight - (2 * margin);
      
      if (tableHeight <= maxHeightPerPage) {
        pdf.addImage(tableImgData, 'PNG', margin, yPosition, tableWidth, tableHeight);
      } else {
        const totalPages = Math.ceil(tableHeight / maxHeightPerPage);
        
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
            yPosition = margin;
          }
          
          const sourceY = i * maxHeightPerPage * (tableCanvas.height / tableHeight);
          const sourceHeight = Math.min(
            maxHeightPerPage * (tableCanvas.height / tableHeight),
            tableCanvas.height - sourceY
          );
          
          const pageTableHeight = (sourceHeight * tableWidth) / tableCanvas.width;
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = tableCanvas.width;
          tempCanvas.height = sourceHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.drawImage(
              tableCanvas,
              0, sourceY, tableCanvas.width, sourceHeight,
              0, 0, tableCanvas.width, sourceHeight
            );
            
            const tempImgData = tempCanvas.toDataURL('image/png');
            pdf.addImage(tempImgData, 'PNG', margin, yPosition, tableWidth, pageTableHeight);
          }
        }
      }
      
      pdf.save(`items-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportItemsAsImage = async () => {
    if (!itemsChartRef.current || !itemsTableRef.current) return;
    
    setIsExporting(true);
    try {
      const container = document.createElement('div');
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '20px';
      
      const chartClone = itemsChartRef.current.cloneNode(true) as HTMLElement;
      const tableClone = itemsTableRef.current.cloneNode(true) as HTMLElement;
      
      container.appendChild(chartClone);
      container.appendChild(tableClone);
      document.body.appendChild(container);
      
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      document.body.removeChild(container);
      
      const link = document.createElement('a');
      link.download = `items-report-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Failed to export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const generateSpectrumColor = (index: number, total: number): string => {
    const hue = (index / total) * 360;
    return `hsl(${hue}, 70%, 55%)`;
  };

  const barChartData = topItems.map((item, idx) => ({
    name: item.itemName,
    value: sortBy === "quantity" ? item.quantity : item.revenue,
    revenue: item.revenue,
    quantity: item.quantity,
    color: generateSpectrumColor(idx, topItems.length)
  }));

  const pieChartData = topItems.map((item, idx) => {
    return {
      name: item.itemName,
      value: sortBy === "quantity" ? item.quantity : item.revenue,
      color: generateSpectrumColor(idx, topItems.length)
    };
  });

  const getPeriodLabel = () => {
    switch (salesTimeRange) {
      case "mtd": return "Month to Date";
      case "30d": return "Last 30 Days";
      case "ytd": return "Year to Date";
      case "12m": return "Last 12 Months";
      case "5y": return "Last 5 Years";
      default: return "";
    }
  };

  return (
    <Tabs defaultValue="sales" className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="ghost" size="sm" disabled={isExporting}>
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={() => window.print()} variant="ghost" size="sm" disabled={isExporting}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <TabsContent value="sales" className="space-y-4 mt-0">
          <div ref={salesChartRef} className="space-y-4 bg-white dark:bg-slate-950 p-4 rounded-lg">
            <div className="text-center space-y-1 pb-3 border-b">
              <h2 className="text-lg font-bold">{t.reports.salesReport}</h2>
              <p className="text-sm text-muted-foreground">{getPeriodLabel()}</p>
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

            <Card className="mt-2">
              <CardContent className="pt-2 pb-2 px-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{t.reports.cashSales}</p>
                    <p className="text-base font-bold leading-tight mt-0.5 text-green-600 dark:text-green-400">{formatCurrency(salesStats.cashSales)}</p>
                  </div>
                  <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-[10px] font-medium mb-2">{t.reports.paymentBreakdown}</h4>
                    <div className="h-[320px]">
                      <StackedBarChart data={salesChartData} />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-1 mt-3 pt-3 border-t overflow-x-auto">
                  {(["mtd", "30d", "ytd", "12m", "5y"] as SalesTimeRange[]).map((range) => (
                    <Button
                      key={range}
                      variant={salesTimeRange === range ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSalesTimeRange(range)}
                      className="h-6 px-2 text-[10px] uppercase whitespace-nowrap"
                    >
                      {range === "mtd" ? "MTD" : range === "30d" ? "30D" : range === "ytd" ? "YTD" : range === "12m" ? "12M" : "5Y"}
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
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <Table2 className="h-3 w-3" />
                  {isSalesMonthlyView ? (salesTimeRange === "5y" ? t.reports.year : t.reports.monthlySalesData) : t.reports.dailySalesData}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {salesData.length > 0 ? (
                  <div className="overflow-x-auto -mx-2">
                    <div className="inline-block min-w-full align-middle">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b">
                            <TableHead className="text-[10px] font-medium py-1 px-2 whitespace-nowrap">
                              {salesTimeRange === "5y" ? t.reports.year : (isSalesMonthlyView ? t.reports.month : t.reports.date)}
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
        </TabsContent>

        <TabsContent value="items" className="space-y-4 mt-0">
          <div ref={itemsChartRef} className="space-y-4 bg-white dark:bg-slate-950 p-4 rounded-lg">
            <Card>
              <CardContent className="p-2">
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

          <div className="flex justify-center gap-2">
            <Button 
              onClick={exportItemsAsPDF} 
              variant="outline" 
              size="sm"
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? t.reports.exporting : t.reports.exportPDF}
            </Button>
            <Button 
              onClick={exportItemsAsImage} 
              variant="outline" 
              size="sm"
              disabled={isExporting}
            >
              <FileImage className="h-4 w-4 mr-2" />
              {isExporting ? t.reports.exporting : t.reports.exportImage}
            </Button>
          </div>

          <div ref={itemsTableRef} className="bg-white dark:bg-slate-950 p-4 rounded-lg">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <Table2 className="h-3 w-3" />
                  {t.reports.topItemsData} ({itemTopN} Items)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
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
                            <TableCell className="text-right text-[10px] font-bold py-1 px-2">{topItemsData.reduce((sum, item) => sum + item.value, 0)}</TableCell>
                            <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(topItemsData.reduce((sum, item) => sum + item.revenue, 0))}</TableCell>
                            <TableCell className="text-right text-[10px] font-bold py-1 px-2">{topItemsData.reduce((sum, item) => sum + item.transactionCount, 0)}</TableCell>
                            <TableCell className="text-right text-[10px] font-bold py-1 px-2">
                              {(topItemsData.reduce((sum, item) => sum + item.value, 0) / topItemsData.reduce((sum, item) => sum + item.transactionCount, 0)).toFixed(1)}
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
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4 mt-0">
          <div className="flex justify-end gap-2">
            <Button
              variant={attendanceTimeRange === "mtd" ? "default" : "outline"}
              size="sm"
              onClick={() => setAttendanceTimeRange("mtd")}
            >
              MTD
            </Button>
            <Button
              variant={attendanceTimeRange === "ytd" ? "default" : "outline"}
              size="sm"
              onClick={() => setAttendanceTimeRange("ytd")}
            >
              YTD
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              {attendanceData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Employee</th>
                        <th className="text-right py-2">Hours</th>
                        <th className="text-right py-2">Days</th>
                        <th className="text-right py-2">Late</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((record, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{record.employeeName}</td>
                          <td className="text-right">{record.totalHours.toFixed(1)}h</td>
                          <td className="text-right">{record.daysWorked}</td>
                          <td className="text-right">{record.lateCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No attendance data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  );
}