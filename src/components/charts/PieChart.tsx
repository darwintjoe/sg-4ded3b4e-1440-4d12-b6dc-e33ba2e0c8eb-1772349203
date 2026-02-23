import { useState, useCallback } from "react";
import { PieChart as RechartsPie, Pie, Cell } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export function PieChart({ data }: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const handleSliceClick = useCallback((index: number) => {
    // Toggle same slice off, or switch to new slice
    setActiveIndex(prev => prev === index ? undefined : index);
  }, []);

  return (
    <div 
      className="w-full flex flex-col items-center"
      onClick={() => setActiveIndex(undefined)}
    >
      <RechartsPie width={300} height={300}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`}
              onClick={(e) => {
                e.stopPropagation();
                handleSliceClick(index);
              }}
              style={{
                cursor: "pointer",
                outline: "none",
                opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.4,
                filter: activeIndex === index ? "brightness(1.1) drop-shadow(0 2px 8px rgba(0,0,0,0.25))" : "none",
                transition: "all 0.2s ease-out",
              }}
            />
          ))}
        </Pie>
      </RechartsPie>
      
      {/* Tooltip below the pie chart */}
      <div className="h-14 flex items-center justify-center">
        {activeIndex !== undefined && data[activeIndex] && (
          <div 
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ 
                backgroundColor: data[activeIndex].color || `hsl(var(--chart-${(activeIndex % 5) + 1}))` 
              }}
            />
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {data[activeIndex].name}
            </div>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {data[activeIndex].value.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}