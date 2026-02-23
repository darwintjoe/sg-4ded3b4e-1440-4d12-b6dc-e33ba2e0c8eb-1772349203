import { useState } from "react";
import { PieChart as RechartsPie, Pie, Cell, Tooltip } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export function PieChart({ data }: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleCellClick = (index: number) => {
    // Toggle selection: tap same slice to deselect, tap different to select
    setActiveIndex(prev => prev === index ? null : index);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <RechartsPie width={350} height={350}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={140}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || "hsl(var(--chart-1))"} 
              style={{ 
                cursor: "pointer",
                outline: "none",
                filter: activeIndex === index 
                  ? "brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.3))" 
                  : "brightness(1)",
                transition: "filter 0.15s ease"
              }}
              onClick={() => handleCellClick(index)}
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          contentStyle={{ 
            fontSize: "12px", 
            backgroundColor: "rgba(255, 255, 255, 0.98)", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
            border: "none",
            borderRadius: "8px",
            padding: "10px 14px"
          }}
          labelStyle={{ fontSize: "12px", fontWeight: "600", marginBottom: "2px" }}
          wrapperStyle={{ outline: "none" }}
          cursor={false}
        />
      </RechartsPie>
    </div>
  );
}