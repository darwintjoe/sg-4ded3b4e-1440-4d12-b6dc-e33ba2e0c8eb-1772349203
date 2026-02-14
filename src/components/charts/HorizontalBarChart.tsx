import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: DataPoint[];
  height?: number;
  valueFormatter?: (value: number) => string;
  barColor?: string;
  showValues?: boolean;
}

export function HorizontalBarChart({ 
  data, 
  height = 400, 
  valueFormatter,
  barColor = "hsl(var(--primary))",
  showValues = true
}: HorizontalBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  console.log("HorizontalBarChart data:", data);
  console.log("HorizontalBarChart maxValue:", maxValue);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">{data.payload.name}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">Quantity:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {valueFormatter ? valueFormatter(data.value) : data.value.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: showValues ? 80 : 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          type="number" 
          domain={[0, maxValue * 1.1]}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => value.toLocaleString("id-ID")}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={150}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={barColor}>
          {showValues && (
            <LabelList 
              dataKey="value" 
              position="right" 
              formatter={(value: number) => value.toLocaleString("id-ID")}
              style={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}