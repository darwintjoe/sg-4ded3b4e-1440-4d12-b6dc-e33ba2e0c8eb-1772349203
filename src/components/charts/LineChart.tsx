import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from "recharts";

interface DataPoint {
  name: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  showGradient?: boolean;
  color?: string;
}

export function LineChart({ data }: LineChartProps) {
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
      <RechartsLine
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 9 }}
          tickMargin={5}
        />
        <YAxis 
          tickFormatter={formatValue}
          tick={{ fontSize: 9 }}
          width={40}
        />
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          contentStyle={{ fontSize: "10px" }}
          labelStyle={{ fontSize: "10px", fontWeight: "bold" }}
        />
        <Legend 
          wrapperStyle={{ fontSize: "9px", paddingTop: "8px" }}
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 4 }}
        />
      </RechartsLine>
    </ResponsiveContainer>
  );
}