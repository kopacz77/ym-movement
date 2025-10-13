// src/hooks/useTimezoneAwareTime.ts
"use client";

import { useEffect, useState } from "react";
import { formatRinkTime } from "@/lib/timezone";

interface TimezoneAwareTimeResult {
  userTime: string;
  rinkTime: string;
  userTimezone: string;
  rinkTimezone: string;
  isDifferentTimezone: boolean;
  userTimezoneAbbr: string;
  rinkTimezoneAbbr: string;
  isLoaded: boolean;
}

export function useTimezoneAwareTime(
  dateTime: Date | string,
  rinkTimezone: string,
  format = "h:mm a",
): TimezoneAwareTimeResult {
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Get user's current timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
    setIsLoaded(true);
  }, []);

  const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;

  // Get timezone abbreviations
  const getUserTimezoneAbbr = () => {
    if (!isLoaded) {
      return "";
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      timeZoneName: "short",
    });
    return (
      formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ||
      userTimezone
    );
  };

  const getRinkTimezoneAbbr = () => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: rinkTimezone,
      timeZoneName: "short",
    });
    return (
      formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ||
      rinkTimezone
    );
  };

  const userTime = isLoaded ? formatRinkTime(date, userTimezone, format) : "";
  const rinkTime = formatRinkTime(date, rinkTimezone, format);
  const isDifferentTimezone = isLoaded && userTimezone !== rinkTimezone;

  return {
    userTime,
    rinkTime,
    userTimezone,
    rinkTimezone,
    isDifferentTimezone,
    userTimezoneAbbr: getUserTimezoneAbbr(),
    rinkTimezoneAbbr: getRinkTimezoneAbbr(),
    isLoaded,
  };
}

// Utility hook for simple timezone-aware time display
export function useAdaptiveTime(
  dateTime: Date | string,
  rinkTimezone: string,
  format = "h:mm a",
): { displayTime: string; timezoneLabel: string; isLoaded: boolean } {
  const result = useTimezoneAwareTime(dateTime, rinkTimezone, format);

  const displayTime = result.isLoaded
    ? result.isDifferentTimezone
      ? result.userTime
      : result.rinkTime
    : result.rinkTime;

  const timezoneLabel = result.isLoaded
    ? result.isDifferentTimezone
      ? result.userTimezoneAbbr
      : result.rinkTimezoneAbbr
    : result.rinkTimezoneAbbr;

  return {
    displayTime,
    timezoneLabel,
    isLoaded: result.isLoaded,
  };
}
