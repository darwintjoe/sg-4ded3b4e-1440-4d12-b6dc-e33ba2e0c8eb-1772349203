import { useState } from "react";
import { PieChart as RechartsPie, Pie, Cell, Tooltip, Sector } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

// Custom active shape that pulls out the selected slice
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "brightness(1.1)", transition: "all 0.2s ease" }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        style={{ opacity: 0.3 }}
      />
    </g>
  );
};

export function PieChart({ data }: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <RechartsPie width={280} height={280}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || "hsl(var(--chart-1))"} 
              style={{ 
                cursor: "pointer",
                outline: "none",
                transition: "all 0.2s ease"
              }}
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