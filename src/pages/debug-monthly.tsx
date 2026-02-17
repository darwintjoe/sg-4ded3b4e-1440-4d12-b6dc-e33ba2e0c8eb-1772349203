import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { MonthlySalesSummary } from "@/types";

export default function DebugMonthly() {
  const [monthlyData, setMonthlyData] = useState<MonthlySalesSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await db.init();
        const data = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
        console.log("Monthly Summary Data:", data);
        setMonthlyData(data.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)));
      } catch (error) {
        console.error("Error loading monthly data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading monthly summary data...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Monthly Sales Summary Table</h1>
      <p className="mb-4">Total Rows: {monthlyData.length} (Expected: 26 months)</p>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">ID</th>
              <th className="border border-gray-300 p-2">Year-Month</th>
              <th className="border border-gray-300 p-2">Total Revenue</th>
              <th className="border border-gray-300 p-2">Total Receipts</th>
              <th className="border border-gray-300 p-2">Avg Transaction</th>
              <th className="border border-gray-300 p-2">Cash</th>
              <th className="border border-gray-300 p-2">QRIS Dynamic</th>
              <th className="border border-gray-300 p-2">QRIS Static</th>
              <th className="border border-gray-300 p-2">Voucher</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.length === 0 ? (
              <tr>
                <td colSpan={9} className="border border-gray-300 p-4 text-center text-red-500">
                  ⚠️ No monthly summary data found! This table should have 26 rows.
                </td>
              </tr>
            ) : (
              monthlyData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">{row.id}</td>
                  <td className="border border-gray-300 p-2 font-mono">{row.yearMonth}</td>
                  <td className="border border-gray-300 p-2 text-right">
                    {row.totalRevenue?.toLocaleString() || 0}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {row.totalReceipts?.toLocaleString() || 0}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {row.avgTransaction?.toLocaleString() || 0}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {row.cash?.toLocaleString() || 0}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {row.qrisDynamic?.toLocaleString() || 0}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {row.qrisStatic?.toLocaleString() || 0}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {row.voucher?.toLocaleString() || 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Raw Data (JSON)</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
          {JSON.stringify(monthlyData, null, 2)}
        </pre>
      </div>
    </div>
  );
}