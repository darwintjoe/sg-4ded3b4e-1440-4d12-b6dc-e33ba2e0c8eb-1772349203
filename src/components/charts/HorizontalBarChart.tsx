import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

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
  // Format value without prefix
  const formatValue = (value: number) => {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + "M";
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(0) + "K";
    }
    return value.toLocaleString();
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          type="number" 
          tickFormatter={formatValue}
          tick={{ fontSize: 9 }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={80}
          tick={{ fontSize: 9 }}
        />
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          contentStyle={{ fontSize: "10px" }}
          labelStyle={{ fontSize: "10px", fontWeight: "bold" }}
        />
        <Bar dataKey="value" fill="hsl(var(--chart-1))" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}