import { Pie, PieChart as RechartsPie, Cell, Tooltip } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export function PieChart({ data }: PieChartProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <RechartsPie width={280} height={280}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="0%"
          outerRadius={130}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || "hsl(var(--chart-1))"} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          contentStyle={{ fontSize: "10px", backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          labelStyle={{ fontSize: "10px", fontWeight: "bold" }}
          cursor={false}
        />
      </RechartsPie>
    </div>
  );
}