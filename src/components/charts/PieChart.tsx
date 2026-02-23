import { useState, useCallback } from "react";
import { PieChart as RechartsPie, Pie, Cell, Sector } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

interface SectorProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  name: string;
  value: number;
  index: number;
}

export function PieChart({ data }: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const handleSliceClick = useCallback((index: number) => {
    // Toggle same slice off, or switch to new slice
    setActiveIndex(prev => prev === index ? undefined : index);
  }, []);

  const renderSlice = (props: SectorProps) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, name, value, index } = props;
    const isActive = activeIndex === index;
    const isInactive = activeIndex !== undefined && activeIndex !== index;

    return (
      <g 
        key={`slice-${index}`}
        onClick={(e) => {
          e.stopPropagation();
          handleSliceClick(index);
        }}
        style={{ cursor: "pointer" }}
      >
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={isActive ? outerRadius + 12 : outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: isActive ? "brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.3))" : "none",
            opacity: isInactive ? 0.5 : 1,
            transition: "all 0.2s ease-out",
          }}
        />
        {/* Tooltip for active slice */}
        {isActive && (
          <>
            <text
              x={cx}
              y={cy - 10}
              textAnchor="middle"
              fill="#333"
              fontSize={14}
              fontWeight={600}
              style={{ pointerEvents: "none" }}
            >
              {name}
            </text>
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              fill="#666"
              fontSize={13}
              style={{ pointerEvents: "none" }}
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div 
      className="w-full h-full flex items-center justify-center"
      onClick={() => setActiveIndex(undefined)}
    >
      <RechartsPie width={350} height={350}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={140}
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
                opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.5,
                filter: activeIndex === index ? "brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.3))" : "none",
                transition: "all 0.2s ease-out",
              }}
            />
          ))}
        </Pie>
      </RechartsPie>
      
      {/* Center tooltip overlay */}
      {activeIndex !== undefined && data[activeIndex] && (
        <div 
          className="absolute pointer-events-none text-center"
          style={{ 
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {data[activeIndex].name}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {data[activeIndex].value.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}