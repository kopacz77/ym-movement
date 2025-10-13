export const ChartSkeleton = () => {
  return (
    <div className="w-full h-full animate-pulse">
      <div className="space-y-4">
        {/* Chart header */}
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>

        {/* Chart area */}
        <div className="h-[400px] bg-gray-100 rounded-lg flex items-end justify-center px-4 pb-4">
          {/* Mock bar chart bars */}
          <div className="flex items-end justify-center gap-2 w-full h-full">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`bar-${i}`}
                className="bg-gray-200 rounded-t w-full"
                style={{
                  height: `${30 + Math.random() * 60}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Chart legend */}
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const LineChartSkeleton = () => {
  return (
    <div className="w-full h-full animate-pulse">
      <div className="space-y-4">
        {/* Chart header */}
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>

        {/* Chart area */}
        <div className="h-[400px] bg-gray-100 rounded-lg relative overflow-hidden">
          {/* Mock line chart grid */}
          <div className="absolute inset-4">
            {/* Horizontal grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute w-full h-px bg-gray-200"
                style={{ top: `${i * 25}%` }}
              />
            ))}

            {/* Mock line path */}
            <svg className="w-full h-full" aria-label="Loading chart" role="img">
              <path
                d="M 0,80 Q 50,40 100,60 T 200,30 T 300,70 T 400,20"
                stroke="#cbd5e0"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4,4"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
