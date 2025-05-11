import { DateTime } from "luxon";
import React from "react";

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
  // Get the local timezone in a readable format
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTimezoneName = localTimezone.split("/").pop()?.replace("_", " ") || localTimezone;
  
  // Get the rink timezone in a readable format
  const rinkTimezoneName = rinkTimezone.split("/").pop()?.replace("_", " ") || rinkTimezone;

  // Calculate time difference
  const calculateTimeDifference = () => {
    // Create DateTime objects for each timezone
    const localNow = DateTime.local();
    const rinkNow = DateTime.local().setZone(rinkTimezone);
    
    // Calculate the difference in hours
    const diffMinutes = rinkNow.offset - localNow.offset;
    return Math.abs(diffMinutes / 60);
  };

  // Determine if rink time is earlier or later than local time
  const calculateTimeDifferenceDirection = () => {
    const localNow = DateTime.local();
    const rinkNow = DateTime.local().setZone(rinkTimezone);
    
    return rinkNow.offset > localNow.offset ? "later" : "earlier";
  };

  // Get hour difference with proper formatting
  const hourDiff = calculateTimeDifference();
  const hourText = hourDiff === 1 ? "hour" : "hours";
  const direction = calculateTimeDifferenceDirection();

  // Show current time in both timezones for clarity
  const now = DateTime.now();
  const localTimeStr = now.toFormat("h:mm a");
  const rinkTimeStr = now.setZone(rinkTimezone).toFormat("h:mm a");

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded p-3 flex items-start text-amber-800 ${className}`}>
      <span className="mr-2 mt-1">🌐</span>
      <div>
        <p className="font-bold">Timezone Notice:</p>
        <p>
          This schedule is displayed in <strong>your local time</strong> ({localTimezoneName}).
          Times at {rinkName} ({rinkTimezoneName}) will be {hourDiff} {hourText} {direction}.
        </p>
        <p className="text-sm mt-1">
          Current time: <strong>{localTimeStr}</strong> your time | <strong>{rinkTimeStr}</strong> {rinkName} time
        </p>
      </div>
    </div>
  );
};

// Also create a simpler version that's just for formatting times
export const formatTimeWithTimezone = (
  time: Date | string,
  rinkTimezone: string,
  format = "h:mm a" // Removed the explicit ": string" type annotation
) => {
  const dateTime = typeof time === "string" 
    ? DateTime.fromISO(time, { zone: "utc" }).setZone(rinkTimezone)
    : DateTime.fromJSDate(time, { zone: "utc" }).setZone(rinkTimezone);
    
  const localDateTime = typeof time === "string"
    ? DateTime.fromISO(time, { zone: "utc" })
    : DateTime.fromJSDate(time, { zone: "utc" });
    
  return {
    localTime: localDateTime.toFormat(format),
    rinkTime: dateTime.toFormat(format),
    localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    rinkTimezone
  };
};