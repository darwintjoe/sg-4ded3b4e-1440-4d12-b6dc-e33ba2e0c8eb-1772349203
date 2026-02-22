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
}

// Custom cursor that shows a subtle highlight instead of black border
const CustomCursor = (props: any) => {
  const { x, y, width, height } = props;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(59, 130, 246, 0.08)"
      stroke="none"
    />
  );
};

export function StackedBarChart({ data }: StackedBarChartProps) {
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
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 9 }}
          tickMargin={5}
          axisLine={{ stroke: "#e5e7eb" }}
          tickLine={false}
        />
        <YAxis 
          tickFormatter={formatValue}
          tick={{ fontSize: 9 }}
          width={55}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          contentStyle={{ 
            fontSize: "11px", 
            backgroundColor: "rgba(255, 255, 255, 0.98)", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
            border: "none",
            borderRadius: "8px",
            padding: "8px 12px"
          }}
          labelStyle={{ fontSize: "11px", fontWeight: "600", marginBottom: "4px" }}
          wrapperStyle={{ outline: "none" }}
          cursor={<CustomCursor />}
        />
        <Legend 
          wrapperStyle={{ fontSize: "9px", paddingTop: "8px", textAlign: "center" }}
          iconSize={8}
          iconType="circle"
          align="center"
        />
        <Bar dataKey="cash" stackId="a" fill="#22c55e" name="Cash" radius={[0, 0, 0, 0]} />
        <Bar dataKey="qrisStatic" stackId="a" fill="#3b82f6" name="QRIS Static" />
        <Bar dataKey="qrisDynamic" stackId="a" fill="#a855f7" name="QRIS Dynamic" />
        <Bar dataKey="voucher" stackId="a" fill="#f59e0b" name="Voucher" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}