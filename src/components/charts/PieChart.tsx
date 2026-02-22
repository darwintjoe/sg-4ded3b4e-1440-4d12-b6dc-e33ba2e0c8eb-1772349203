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

  return (
    <div className="w-full h-full flex items-center justify-center">
      <RechartsPie width={350} height={350}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={activeIndex !== null ? 125 : 137}
          paddingAngle={2}
          dataKey="value"
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || "hsl(var(--chart-1))"} 
              style={{ 
                cursor: "pointer",
                outline: "none",
                filter: activeIndex === index ? "brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.2))" : "brightness(1)",
                transform: activeIndex === index ? "scale(1.08)" : "scale(1)",
                transformOrigin: "center",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={() => setActiveIndex(index)}
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