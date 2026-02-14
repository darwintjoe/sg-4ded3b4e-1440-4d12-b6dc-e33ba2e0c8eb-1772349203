import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

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
  const chartHeight = 250;

  return (
    <div className="w-full flex items-center justify-center overflow-x-auto">
      <RechartsLine
        width={chartWidth}
        height={chartHeight}
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 9 }}
          tickMargin={5}
        />
        <YAxis 
          tickFormatter={formatValue}
          tick={{ fontSize: 9 }}
          width={45}
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
    </div>
  );
}