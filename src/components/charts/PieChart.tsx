import { Pie, PieChart as RechartsPie, Cell, Tooltip } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export function PieChart({ data }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-2">
          <p className="text-[10px] font-semibold mb-1 text-foreground">{item.name}</p>
          <p className="text-[9px] text-muted-foreground">
            {item.value.toLocaleString()} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

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
        <Tooltip content={<CustomTooltip />} />
      </RechartsPie>
    </div>
  );
}