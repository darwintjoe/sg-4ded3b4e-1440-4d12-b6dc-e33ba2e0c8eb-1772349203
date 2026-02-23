import { useState, useCallback } from "react";
import { PieChart as RechartsPie, Pie, Cell, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

const renderActiveShape = (props: PieSectorDataItem) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, name, value } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius || 140) + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill || "hsl(var(--chart-1))"}
        style={{
          filter: "brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
        }}
      />
      {/* Custom tooltip positioned at center */}
      <text
        x={cx}
        y={(cy || 175) - 10}
        textAnchor="middle"
        fill="#333"
        fontSize={14}
        fontWeight={600}
      >
        {name}
      </text>
      <text
        x={cx}
        y={(cy || 175) + 12}
        textAnchor="middle"
        fill="#666"
        fontSize={13}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </text>
    </g>
  );
};

const renderInactiveShape = (props: PieSectorDataItem) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill || "hsl(var(--chart-1))"}
    />
  );
};

export function PieChart({ data }: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const handleCellClick = useCallback((_: unknown, index: number) => {
    setActiveIndex(prev => prev === index ? undefined : index);
  }, []);

  const handlePieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActiveIndex(undefined);
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
          activeShape={renderActiveShape}
          inactiveShape={renderInactiveShape}
          onMouseEnter={handlePieEnter}
          onMouseLeave={handlePieLeave}
          onClick={handleCellClick}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || "hsl(var(--chart-1))"}
              style={{
                cursor: "pointer",
                outline: "none",
                opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.6,
              }}
            />
          ))}
        </Pie>
      </RechartsPie>
    </div>
  );
}