// src/components/TimezoneAwareLessonTime.tsx
"use client";

import { Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { formatUtcDate } from "@/lib/date-utils";
import { formatRinkTime } from "@/lib/timezone";

interface TimezoneAwareLessonTimeProps {
  startTime: Date;
  endTime: Date;
  rinkTimezone: string;
  rinkName: string;
  duration: number;
}

export function TimezoneAwareLessonTime({
  startTime,
  endTime,
  rinkTimezone,
  rinkName,
  duration,
}: TimezoneAwareLessonTimeProps) {
  const [userTimezone, setUserTimezone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get user's current timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
    setMounted(true);
  }, []);

  if (!mounted) {
    // Server-side fallback - show rink time only
    return (
      <div>
        <h3 className="font-medium">Date & Time</h3>
        <p className="text-gray-600">
          {formatUtcDate(startTime)}, {formatRinkTime(startTime, rinkTimezone)} -{" "}
          {formatRinkTime(endTime, rinkTimezone)} ({duration} minutes)
        </p>
        <p className="text-xs text-gray-500">
          Times shown in rink timezone ({rinkTimezone.replace("_", " ")})
        </p>
      </div>
    );
  }

  const userTimeStart = formatRinkTime(startTime, userTimezone!);
  const userTimeEnd = formatRinkTime(endTime, userTimezone!);
  const rinkTimeStart = formatRinkTime(startTime, rinkTimezone);
  const rinkTimeEnd = formatRinkTime(endTime, rinkTimezone);

  // Check if user is in a different timezone than the rink
  const isDifferentTimezone = userTimezone !== rinkTimezone;

  // Get timezone abbreviations for display
  const getUserTimezoneAbbr = () => {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone!,
      timeZoneName: "short",
    });
    return (
      formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ||
      userTimezone
    );
  };

  const getRinkTimezoneAbbr = () => {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: rinkTimezone,
      timeZoneName: "short",
    });
    return (
      formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ||
      rinkTimezone
    );
  };

  return (
    <div>
      <h3 className="font-medium">Date & Time</h3>

      {isDifferentTimezone ? (
        <div className="space-y-2">
          {/* User's current timezone - PRIMARY */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0891b2]" />
            <div>
              <p className="text-gray-900 font-medium">
                {formatUtcDate(startTime)}, {userTimeStart} - {userTimeEnd} ({duration} minutes)
              </p>
              <p className="text-xs text-[#0891b2] font-medium">
                Your current time ({getUserTimezoneAbbr()})
              </p>
            </div>
          </div>

          {/* Rink timezone - SECONDARY */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-gray-600">
                {rinkTimeStart} - {rinkTimeEnd}
              </p>
              <p className="text-xs text-gray-500">
                Local time at {rinkName} ({getRinkTimezoneAbbr()})
              </p>
            </div>
          </div>

          {/* Travel warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
            <p className="text-sm text-amber-800">
              <strong>🧳 Timezone Change Detected:</strong> You appear to be in a different timezone
              than when you booked. Make sure to arrive at the rink according to the local time
              shown above.
            </p>
          </div>
        </div>
      ) : (
        /* Same timezone - simple display */
        <div>
          <p className="text-gray-600">
            {formatUtcDate(startTime)}, {rinkTimeStart} - {rinkTimeEnd} ({duration} minutes)
          </p>
          <p className="text-xs text-gray-500">Local time ({getRinkTimezoneAbbr()})</p>
        </div>
      )}
    </div>
  );
}
