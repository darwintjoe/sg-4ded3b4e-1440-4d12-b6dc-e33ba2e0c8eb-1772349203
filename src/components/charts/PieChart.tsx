import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: DataPoint[];
  height?: number;
  showPercentage?: boolean;
}

export function PieChart({ data }: PieChartProps) {
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

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPie margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius="70%"
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => formatValue(value)}
          contentStyle={{ fontSize: "10px" }}
          labelStyle={{ fontSize: "10px", fontWeight: "bold" }}
        />
        <Legend 
          wrapperStyle={{ fontSize: "9px", paddingTop: "4px" }}
          iconSize={8}
        />
      </RechartsPie>
    </ResponsiveContainer>
  );
}