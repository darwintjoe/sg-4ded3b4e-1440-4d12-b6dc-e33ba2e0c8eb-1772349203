import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip } from "recharts";
import { useState } from "react";

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
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const formatValue = (value: number) => {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + "M";
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(0) + "K";
    }
    return value.toLocaleString();
  };

  const chartWidth = 340;
  const chartHeight = Math.min(data.length * 35 + 60, 400);

  return (
    <div className="w-full flex items-center justify-center overflow-x-auto">
      <RechartsBarChart
        width={chartWidth}
        height={chartHeight}
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        onMouseLeave={() => setActiveIndex(undefined)}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
        <XAxis 
          type="number" 
          tickFormatter={formatValue}
          tick={{ fontSize: 10 }}
          axisLine={{ stroke: "#e5e7eb" }}
          tickLine={false}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={100}
          tick={{ fontSize: 10 }}
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
          labelStyle={{ fontSize: "11px", fontWeight: "600", marginBottom: "2px" }}
          wrapperStyle={{ outline: "none" }}
          cursor={false}
        />
        <Bar 
          dataKey="value" 
          radius={[0, 4, 4, 0]}
          onMouseEnter={(_, index) => setActiveIndex(index)}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || "hsl(var(--chart-1))"} 
              style={{ 
                cursor: "pointer",
                outline: "none",
                filter: activeIndex === index ? "brightness(1.15)" : "brightness(1)",
                transition: "all 0.15s ease"
              }}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </div>
  );
}