import React from "react";

export const CalendarSkeleton = () => {
  return (
    <div className="w-full h-full animate-pulse">
      <div className="space-y-4">
        {/* Calendar header */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Calendar toolbar */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        </div>

        {/* Calendar grid */}
        <div className="border rounded-lg">
          {/* Calendar header row */}
          <div className="grid grid-cols-7 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`header-${i}`} className="p-2 border-r last:border-r-0">
                <div className="h-4 bg-gray-200 rounded w-8" />
              </div>
            ))}
          </div>

          {/* Calendar body */}
          {Array.from({ length: 6 }).map((_, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 border-b last:border-b-0">
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div
                  key={`day-${weekIndex}-${dayIndex}`}
                  className="p-2 h-24 border-r last:border-r-0"
                >
                  <div className="h-4 bg-gray-200 rounded w-6 mb-2" />
                  <div className="space-y-1">
                    <div className="h-3 bg-blue-100 rounded w-full" />
                    <div className="h-3 bg-green-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
