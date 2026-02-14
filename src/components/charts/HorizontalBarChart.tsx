import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

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

export function HorizontalBarChart({ data }: HorizontalBarChartProps) {
  const formatValue = (value: number) => {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + "M";
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(0) + "K";
    }
    return value.toLocaleString();
  };

  // Mobile-optimized dimensions
  const chartWidth = 340;
  const chartHeight = Math.min(data.length * 35 + 60, 400); // Dynamic height based on data, max 400px

  return (
    <div className="w-full flex items-center justify-center overflow-x-auto">
      <RechartsBarChart
        width={chartWidth}
        height={chartHeight}
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          type="number" 
          tickFormatter={formatValue}
          tick={{ fontSize: 10 }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={100}
          tick={{ fontSize: 10 }}
        />
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          contentStyle={{ fontSize: "11px" }}
          labelStyle={{ fontSize: "11px", fontWeight: "bold" }}
        />
        <Bar dataKey="value" fill="hsl(var(--chart-1))" />
      </RechartsBarChart>
    </div>
  );
}