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

export function PieChart({ data, height = 400, showPercentage = true }: PieChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  const formatValue = (value: number) => {
    if (showPercentage) {
      const percentage = ((value / total) * 100).toFixed(1);
      return `${percentage}%`;
    }
    return value.toLocaleString("id-ID");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">{data.name}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">Value:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {data.value.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">Percentage:</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {percentage}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    const rawPercentage = (entry.value / total) * 100;
    return rawPercentage > 5 ? `${rawPercentage.toFixed(1)}%` : "";
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value, entry: any) => {
            const dataPoint = data.find(d => d.name === value);
            if (dataPoint) {
              return `${value} (${formatValue(dataPoint.value)})`;
            }
            return value;
          }}
        />
      </RechartsPie>
    </ResponsiveContainer>
  );
}