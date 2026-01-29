import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataPoint {
  name: string;
  cash: number;
  qrisStatic: number;
  qrisDynamic: number;
  voucher: number;
}

interface StackedBarChartProps {
  data: DataPoint[];
  height?: number;
}

export function StackedBarChart({ data, height = 400 }: StackedBarChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `Rp ${(value / 1000).toFixed(0)}K`;
    }
    return `Rp ${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{entry.name}:</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total:</span>
                <span className="font-black text-green-600 dark:text-green-400">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="name" 
          tick={{ fill: "currentColor" }}
          className="text-slate-600 dark:text-slate-400"
        />
        <YAxis 
          tickFormatter={formatCurrency}
          tick={{ fill: "currentColor" }}
          className="text-slate-600 dark:text-slate-400"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="square"
        />
        <Bar dataKey="cash" stackId="a" fill="#10b981" name="💵 Cash" radius={[0, 0, 0, 0]} />
        <Bar dataKey="qrisStatic" stackId="a" fill="#3b82f6" name="📱 QRIS Static" radius={[0, 0, 0, 0]} />
        <Bar dataKey="qrisDynamic" stackId="a" fill="#8b5cf6" name="💳 QRIS Dynamic" radius={[0, 0, 0, 0]} />
        <Bar dataKey="voucher" stackId="a" fill="#f59e0b" name="🎟️ Voucher" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}