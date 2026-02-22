import { useState } from "react";
import { PieChart as RechartsPie, Pie, Cell, Tooltip, Sector } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export function PieChart({ data }: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calculate the pull-out offset for active slice
  const getSliceOffset = (index: number, startAngle: number, endAngle: number) => {
    if (activeIndex !== index) return { dx: 0, dy: 0 };
    
    // Calculate midpoint angle and offset
    const midAngle = (startAngle + endAngle) / 2;
    const radian = (Math.PI / 180) * midAngle;
    const offset = 8; // Pull-out distance
    
    return {
      dx: Math.cos(radian) * offset,
      dy: -Math.sin(radian) * offset
    };
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <RechartsPie width={280} height={280}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={activeIndex !== null ? 100 : 110}
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
                transform: activeIndex === index ? "scale(1.05)" : "scale(1)",
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
      </RechartsPie>
    </div>
  );
}