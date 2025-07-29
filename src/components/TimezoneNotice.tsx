import { DateTime } from "luxon";
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
  // Get the local timezone in a readable format
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTimezoneName = localTimezone.split("/").pop()?.replace("_", " ") || localTimezone;

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

  // Calculate time difference and determine relationship
  const getTimezoneRelationship = () => {
    const now = DateTime.now();
    const localTime = now.setZone(localTimezone);
    const rinkTime = now.setZone(rinkTimezone);

    // Calculate the difference in hours (how many hours ahead/behind local is compared to rink)
    const diffHours = Math.abs((localTime.offset - rinkTime.offset) / 60);

    // Determine relationship from local perspective
    // If local offset > rink offset, local is ahead (east of) rink
    // If local offset < rink offset, local is behind (west of) rink
    const isLocalAhead = localTime.offset > rinkTime.offset;

    return {
      hours: diffHours,
      direction: isLocalAhead ? "ahead of" : "behind",
    };
  };

  // Get timezone relationship
  const { hours: hourDiff, direction } = getTimezoneRelationship();
  const hourText = hourDiff === 1 ? "hour" : "hours";

  // Show current time in both timezones for clarity
  const now = DateTime.now();
  const localTimeStr = now.toFormat("h:mm a");
  const rinkTimeStr = now.setZone(rinkTimezone).toFormat("h:mm a");

  // Don't show timezone notice if they're the same timezone
  if (localTimezone === rinkTimezone || hourDiff === 0) {
    return (
      <div
        className={`bg-green-50 border border-green-200 rounded p-3 flex items-start text-green-800 ${className}`}
      >
        <span className="mr-2 mt-1">🌐</span>
        <div>
          <p className="font-bold">Timezone Notice:</p>
          <p>This schedule is displayed in your local time ({localTimezoneName}).</p>
          <p className="text-sm mt-1">
            Current time: <strong>{localTimeStr}</strong>
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
          This schedule is displayed in <strong>the rink time</strong> ({rinkTimezoneName}). Your
          local time ({localTimezoneName}) is {hourDiff} {hourText} {direction} the rink time.
        </p>
        <p className="text-sm mt-1">
          Current time: <strong>{localTimeStr}</strong> your time | <strong>{rinkTimeStr}</strong>{" "}
          the rink time
        </p>
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
