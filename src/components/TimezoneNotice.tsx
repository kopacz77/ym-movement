import { DateTime } from "luxon";
import { useState, useEffect } from "react";
import type React from "react";

interface TimezoneNoticeProps {
  rinkTimezone: string;
  rinkName?: string;
  className?: string;
}

export const TimezoneNotice: React.FC<TimezoneNoticeProps> = ({
  rinkTimezone,
  rinkName = "the rink",
  className = "",
}) => {
  // State for current time and timezone info (to prevent hydration mismatch)
  const [currentTimes, setCurrentTimes] = useState<{
    localTimeStr: string;
    rinkTimeStr: string;
  } | null>(null);

  const [timezoneInfo, setTimezoneInfo] = useState<{
    localTimezone: string;
    localTimezoneName: string;
    hourDiff: number;
    direction: string;
    hourText: string;
  } | null>(null);

  // Get the rink timezone in a readable format
  const getRinkTimezoneName = (timezone: string) => {
    // Map common timezone identifiers to city names
    const timezoneMap: Record<string, string> = {
      "America/New_York": "New York",
      "America/Chicago": "Chicago",
      "America/Denver": "Denver",
      "America/Los_Angeles": "Los Angeles",
      "America/Detroit": "Detroit",
      "America/Toronto": "Toronto",
      "America/Vancouver": "Vancouver",
      "America/Montreal": "Montreal",
      "America/Phoenix": "Phoenix",
      "America/Anchorage": "Anchorage",
      "America/Honolulu": "Honolulu",
    };

    return timezoneMap[timezone] || timezone.split("/").pop()?.replace("_", " ") || timezone;
  };

  const rinkTimezoneName = getRinkTimezoneName(rinkTimezone);

  // Update current time and timezone info only on client side to prevent hydration mismatch
  useEffect(() => {
    const updateTimeAndTimezone = () => {
      const now = DateTime.now();
      
      // Get current times
      setCurrentTimes({
        localTimeStr: now.toFormat("h:mm a"),
        rinkTimeStr: now.setZone(rinkTimezone).toFormat("h:mm a"),
      });

      // Calculate timezone info on client side
      const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTimezoneName = localTimezone.split("/").pop()?.replace("_", " ") || localTimezone;

      const localTime = now.setZone(localTimezone);
      const rinkTime = now.setZone(rinkTimezone);

      // Calculate the difference in hours (how many hours ahead/behind local is compared to rink)
      const diffHours = Math.abs((localTime.offset - rinkTime.offset) / 60);

      // Determine relationship from local perspective
      const isLocalAhead = localTime.offset > rinkTime.offset;

      setTimezoneInfo({
        localTimezone,
        localTimezoneName,
        hourDiff: diffHours,
        direction: isLocalAhead ? "ahead of" : "behind",
        hourText: diffHours === 1 ? "hour" : "hours",
      });
    };

    // Initial update
    updateTimeAndTimezone();

    // Update every minute
    const interval = setInterval(updateTimeAndTimezone, 60000);

    return () => clearInterval(interval);
  }, [rinkTimezone]);

  // Show simplified version if timezones are the same (only check on client side)
  if (timezoneInfo && (timezoneInfo.localTimezone === rinkTimezone || timezoneInfo.hourDiff === 0)) {
    return (
      <div
        className={`bg-green-50 border border-green-200 rounded p-3 flex items-start text-green-800 ${className}`}
      >
        <span className="mr-2 mt-1">🌐</span>
        <div>
          <p className="font-bold">Timezone Notice:</p>
          <p>This schedule is displayed in your local time ({timezoneInfo?.localTimezoneName || "Loading..."}).</p>
          <p className="text-sm mt-1">
            Current time: <strong>{currentTimes?.localTimeStr}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded p-3 flex items-start text-amber-800 ${className}`}
    >
      <span className="mr-2 mt-1">🌐</span>
      <div>
        <p className="font-bold">Timezone Notice:</p>
        <p>
          This schedule is displayed in <strong>the rink time</strong> ({rinkTimezoneName}). 
          {timezoneInfo ? (
            <>Your local time ({timezoneInfo.localTimezoneName}) is {timezoneInfo.hourDiff} {timezoneInfo.hourText} {timezoneInfo.direction} the rink time.</>
          ) : (
            <>Loading timezone information...</>
          )}
        </p>
        {currentTimes && (
          <p className="text-sm mt-1">
            Current time: <strong>{currentTimes.localTimeStr}</strong> your time |{" "}
            <strong>{currentTimes.rinkTimeStr}</strong> the rink time
          </p>
        )}
      </div>
    </div>
  );
};

// Also create a simpler version that's just for formatting times
export const formatTimeWithTimezone = (
  time: Date | string,
  rinkTimezone: string,
  format = "h:mm a", // Removed the explicit ": string" type annotation
) => {
  const dateTime =
    typeof time === "string"
      ? DateTime.fromISO(time, { zone: "utc" }).setZone(rinkTimezone)
      : DateTime.fromJSDate(time, { zone: "utc" }).setZone(rinkTimezone);

  const localDateTime =
    typeof time === "string"
      ? DateTime.fromISO(time, { zone: "utc" })
      : DateTime.fromJSDate(time, { zone: "utc" });

  return {
    localTime: localDateTime.toFormat(format),
    rinkTime: dateTime.toFormat(format),
    localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    rinkTimezone,
  };
};
