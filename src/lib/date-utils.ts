// src/lib/date-utils.ts
/**
 * Utility functions for consistent date and time handling throughout the application.
 * This ensures that times are displayed correctly regardless of the user's local timezone.
 */

/**
 * Format a UTC datetime string to display time in 24h format without timezone conversion
 * This is useful when you want to show the exact time stored in the database (UTC)
 * Example: "14:30"
 */
export function formatUtcTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(
    2,
    "0",
  )}`;
}

/**
 * Format a UTC datetime string to display time in 12h format without timezone conversion
 * Example: "2:30 PM"
 */
export function formatUtcTime12h(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM

  return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

/**
 * Format a UTC date string to display date in a standardized format without timezone conversion
 * Example: "Monday, March 16, 2025"
 */
export function formatUtcDate(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  
  // Create a new date using UTC components to avoid timezone shifts
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  
  // Format using standard JS methods but on our UTC-preserved date
  return utcDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date string to display date in a standardized format
 * Example: "Monday, March 16, 2025"
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a duration in minutes to a human readable format
 * Example: "1 hour 30 minutes"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} minute${mins !== 1 ? "s" : ""}`;
  }

  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  return `${hours} hour${hours !== 1 ? "s" : ""} ${mins} minute${mins !== 1 ? "s" : ""}`;
}

/**
 * Format a date range (e.g., for a week view)
 * Example: "Mar 16 - 22, 2025"
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = startDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Format a time for display with timezone abbreviation
 * Example: "2:30 PM PST"
 */
export function formatTimeWithTimezone(dateStr: string | Date, timezone: string): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;

  // Get timezone abbreviation based on timezone identifier
  const timezoneAbbreviations: Record<string, string> = {
    "America/Los_Angeles": "PST",
    "America/New_York": "EST",
    "America/Chicago": "CST",
    "America/Denver": "MST",
    // Add more as needed
  };

  const tzAbbr = timezoneAbbreviations[timezone] || timezone;

  // Format time in 12h format
  const time = formatUtcTime12h(date);

  return `${time} ${tzAbbr}`;
}

/**
 * Format a date and time range with timezone for display
 * Example: "Monday, March 16, 2025 from 2:30 PM to 3:30 PM PST"
 */
export function formatDateTimeRange(
  startTime: string | Date,
  endTime: string | Date,
  timezone: string,
): string {
  const date = formatUtcDate(startTime);
  const start = formatUtcTime12h(startTime);
  const end = formatUtcTime12h(endTime);

  // Get timezone abbreviation
  const timezoneAbbreviations: Record<string, string> = {
    "America/Los_Angeles": "PST",
    "America/New_York": "EST",
    "America/Chicago": "CST",
    "America/Denver": "MST",
    // Add more as needed
  };

  const tzAbbr = timezoneAbbreviations[timezone] || timezone;

  return `${date} from ${start} to ${end} ${tzAbbr}`;
}