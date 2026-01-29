interface HeatmapCell {
  day: string;
  hour: number;
  value: number;
}

interface HeatmapProps {
  data: HeatmapCell[];
  height?: number;
}

export function Heatmap({ data, height = 300 }: HeatmapProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];

  const maxValue = Math.max(...data.map(d => d.value), 1);

  const getIntensity = (day: string, hour: number): number => {
    const cell = data.find(d => d.day === day && d.hour === hour);
    if (!cell || cell.value === 0) return 0;
    return (cell.value / maxValue) * 100;
  };

  const getColor = (intensity: number): string => {
    if (intensity === 0) return "bg-slate-100 dark:bg-slate-800";
    if (intensity < 25) return "bg-green-200 dark:bg-green-900";
    if (intensity < 50) return "bg-green-400 dark:bg-green-700";
    if (intensity < 75) return "bg-green-600 dark:bg-green-500";
    return "bg-green-800 dark:bg-green-400";
  };

  const getTooltipText = (day: string, hour: number): string => {
    const cell = data.find(d => d.day === day && d.hour === hour);
    const value = cell?.value || 0;
    const intensity = getIntensity(day, hour);
    return `${day} ${hour}:00 - ${value} sales (${intensity.toFixed(0)}%)`;
  };

  return (
    <div className="space-y-4" style={{ height }}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600 dark:text-slate-400">Intensity:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600"></div>
          <span className="text-xs text-slate-500">0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-200 dark:bg-green-900 border border-slate-300 dark:border-slate-600"></div>
          <span className="text-xs text-slate-500">25%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-400 dark:bg-green-700 border border-slate-300 dark:border-slate-600"></div>
          <span className="text-xs text-slate-500">50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-600 dark:bg-green-500 border border-slate-300 dark:border-slate-600"></div>
          <span className="text-xs text-slate-500">75%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-800 dark:bg-green-400 border border-slate-300 dark:border-slate-600"></div>
          <span className="text-xs text-slate-500">100%</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${hours.length}, 1fr)` }}>
            <div></div>
            {hours.map(hour => (
              <div key={hour} className="text-center text-xs font-medium text-slate-600 dark:text-slate-400 pb-2">
                {hour}:00
              </div>
            ))}
            
            {days.map(day => (
              <>
                <div key={`${day}-label`} className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                  {day}
                </div>
                {hours.map(hour => {
                  const intensity = getIntensity(day, hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`h-10 rounded ${getColor(intensity)} border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 cursor-pointer`}
                      title={getTooltipText(day, hour)}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}