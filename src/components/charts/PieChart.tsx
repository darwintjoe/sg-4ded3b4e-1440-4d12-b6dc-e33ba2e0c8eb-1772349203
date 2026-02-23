import { useState, useCallback } from "react";
import { PieChart as RechartsPie, Pie, Cell, Tooltip, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

const renderActiveShape = (props: PieSectorDataItem) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius || 140) + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill || "hsl(var(--chart-1))"}
        style={{
          filter: "brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
        }}
      />
    </g>
  );
};

export function PieChart({ data }: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const handleCellClick = useCallback((index: number) => {
    setActiveIndex(prev => prev === index ? undefined : index);
  }, []);

  const handlePieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

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
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          onMouseEnter={handlePieEnter}
          onClick={(_, index) => handleCellClick(index)}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || "hsl(var(--chart-1))"}
              style={{
                cursor: "pointer",
                outline: "none",
              }}
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
        />
      </RechartsPie>
    </div>
  );
}