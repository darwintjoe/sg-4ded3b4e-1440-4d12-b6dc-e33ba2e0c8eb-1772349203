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
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 9 }}
          tickMargin={5}
        />
        <YAxis 
          tickFormatter={formatValue}
          tick={{ fontSize: 9 }}
          width={55}
        />
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          contentStyle={{ fontSize: "10px" }}
          labelStyle={{ fontSize: "10px", fontWeight: "bold" }}
          cursor={false}
        />
        <Legend 
          wrapperStyle={{ fontSize: "9px", paddingTop: "8px" }}
          iconSize={8}
          align="center"
        />
        <Bar dataKey="cash" stackId="a" fill="#22c55e" name="Cash" />
        <Bar dataKey="qrisStatic" stackId="a" fill="#3b82f6" name="QRIS Static" />
        <Bar dataKey="qrisDynamic" stackId="a" fill="#a855f7" name="QRIS Dynamic" />
        <Bar dataKey="voucher" stackId="a" fill="#f59e0b" name="Voucher" />
      </BarChart>
    </ResponsiveContainer>
  );
}