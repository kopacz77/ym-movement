// src/components/AdaptiveTime.tsx
"use client";

import { useAdaptiveTime } from "@/hooks/useTimezoneAwareTime";
import { cn } from "@/lib/utils";

interface AdaptiveTimeProps {
  dateTime: Date | string;
  rinkTimezone: string;
  format?: string;
  showTimezone?: boolean;
  className?: string;
}

export function AdaptiveTime({
  dateTime,
  rinkTimezone,
  format = "h:mm a",
  showTimezone = true,
  className,
}: AdaptiveTimeProps) {
  const { displayTime, timezoneLabel, isLoaded } = useAdaptiveTime(dateTime, rinkTimezone, format);

  return (
    <span className={cn(className)}>
      {displayTime}
      {showTimezone && isLoaded && (
        <span className="text-xs text-muted-foreground ml-1">
          ({timezoneLabel})
        </span>
      )}
    </span>
  );
}

interface AdaptiveTimeRangeProps {
  startTime: Date | string;
  endTime: Date | string;
  rinkTimezone: string;
  format?: string;
  showTimezone?: boolean;
  className?: string;
}

export function AdaptiveTimeRange({
  startTime,
  endTime,
  rinkTimezone,
  format = "h:mm a",
  showTimezone = true,
  className,
}: AdaptiveTimeRangeProps) {
  const start = useAdaptiveTime(startTime, rinkTimezone, format);
  const end = useAdaptiveTime(endTime, rinkTimezone, format);

  return (
    <span className={cn(className)}>
      {start.displayTime} - {end.displayTime}
      {showTimezone && start.isLoaded && (
        <span className="text-xs text-muted-foreground ml-1">
          ({start.timezoneLabel})
        </span>
      )}
    </span>
  );
}