import { Pie, PieChart as RechartsPie, ResponsiveContainer, Cell, Tooltip } from "recharts";

interface PieChartData {
  name: string;
  value: number;
  fill?: string;
}

interface PieChartProps {
  data: PieChartData[];
}

export function PieChart({ data }: PieChartProps) {
  // Default colors if not provided
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(220, 70%, 60%)",
    "hsl(280, 70%, 60%)",
    "hsl(340, 70%, 60%)",
    "hsl(40, 90%, 60%)",
    "hsl(160, 70%, 50%)",
  ];

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Custom tooltip with item name and percentage
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-2">
          <p className="text-[11px] font-semibold mb-1">{item.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {item.value.toLocaleString()} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="0%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.fill || COLORS[index % COLORS.length]}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </RechartsPie>
    </ResponsiveContainer>
  );
}