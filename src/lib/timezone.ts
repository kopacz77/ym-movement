// src/lib/timezone.ts
import { DateTime } from "luxon";

/**
 * Formats a UTC date to a local time in the specified timezone
 *
 * @param utcDate - The UTC date to format (can be Date object or ISO string)
 * @param tz - The IANA timezone string (e.g., 'America/New_York')
 * @param fmt - The format string to use (default: 'h:mm a')
 * @returns The formatted time string in the specified timezone
 */
export function formatRinkTime(utcDate: Date | string, tz: string, fmt = "h:mm a"): string {
  try {
    // Convert to Luxon DateTime and set to the specified timezone
    const dt = typeof utcDate === "string" 
      ? DateTime.fromISO(utcDate, { zone: "utc" }).setZone(tz)
      : DateTime.fromJSDate(utcDate, { zone: "utc" }).setZone(tz);
    
    if (!dt.isValid) {
      console.error("Invalid date provided to formatRinkTime:", utcDate);
      return "Invalid date";
    }

    return dt.toFormat(fmt);
  } catch (error) {
    console.error("Error formatting time:", error, { date: utcDate, timezone: tz });
    return typeof utcDate === "string" ? utcDate : utcDate.toString();
  }
}

/**
 * Returns a formatting function that's bound to a specific timezone
 * Useful for creating formatters to use in multiple places
 */
export function createTimeFormatter(tz: string, fmt = "h:mm a") {
  return (date: Date | string) => formatRinkTime(date, tz, fmt);
}

/**
 * Returns a human-readable representation of the date and time in the specified timezone
 */
export function formatRinkDateTime(utcDate: Date | string, tz: string): string {
  // Format date and time with day name
  return formatRinkTime(utcDate, tz, "EEEE, MMMM d, yyyy h:mm a");
}

/**
 * Formats a UTC date to a 24-hour time format in the specified timezone
 * Useful for consistent display in calendars and schedules
 */
export function formatRinkTime24h(utcDate: Date | string, tz: string): string {
  return formatRinkTime(utcDate, tz, "HH:mm");
}

/**
 * Converts a local time (in a specific timezone) to UTC
 * Useful when saving times to the database
 * 
 * @param localDate - The local date to convert (can be Date object or ISO string)
 * @param tz - The IANA timezone string of the local date (e.g., 'America/New_York')
 * @returns A new Date object in UTC
 */
export function convertToUTC(localDate: Date | string, tz: string): Date {
  try {
    // Create a DateTime in the specified timezone
    const dt = typeof localDate === "string"
      ? DateTime.fromISO(localDate, { zone: tz })
      : DateTime.fromJSDate(localDate, { zone: tz });
    
    if (!dt.isValid) {
      console.error("Invalid date for conversion to UTC:", localDate);
      return new Date();
    }
    
    // Convert to UTC and return as JS Date
    return dt.toUTC().toJSDate();
  } catch (error) {
    console.error("Error converting to UTC:", error);
    return new Date();
  }
}

/**
 * Parse a time string in a specific timezone
 * 
 * @param timeStr - Time string in format HH:mm 
 * @param date - Reference date
 * @param tz - The timezone to parse in
 * @returns Date object representing that time
 */
export function parseTimeInTimezone(timeStr: string, date: Date, tz: string): Date {
  try {
    // Create a DateTime from the reference date in the target timezone
    const refDate = DateTime.fromJSDate(date).setZone(tz);
    
    // Parse the time components
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Set the time while keeping the date the same
    const dateTime = refDate.set({ hour: hours, minute: minutes });
    
    // Convert back to UTC and return as JS Date
    return dateTime.toUTC().toJSDate();
  } catch (error) {
    console.error("Error parsing time in timezone:", error);
    return new Date();
  }
}

/**
 * Determines if two dates are on the same day in a specific timezone
 */
export function isSameDay(date1: Date | string, date2: Date | string, tz: string): boolean {
  const d1 = typeof date1 === "string" 
    ? DateTime.fromISO(date1, { zone: "utc" }).setZone(tz)
    : DateTime.fromJSDate(date1, { zone: "utc" }).setZone(tz);
    
  const d2 = typeof date2 === "string"
    ? DateTime.fromISO(date2, { zone: "utc" }).setZone(tz)
    : DateTime.fromJSDate(date2, { zone: "utc" }).setZone(tz);
  
  return d1.hasSame(d2, 'day');
}

/**
 * This function adds metadata to explain timezone context
 * Useful for UI displays to make it clear to users which timezone is being used
 */
export function formatTimeWithContext(date: Date | string, tz: string, fmt = "h:mm a"): { 
  time: string; 
  timezone: string;
  tzAbbr: string;
} {
  const dt = typeof date === "string"
    ? DateTime.fromISO(date, { zone: "utc" }).setZone(tz)
    : DateTime.fromJSDate(date, { zone: "utc" }).setZone(tz);
  
  const time = dt.toFormat(fmt);
  const tzAbbr = dt.toFormat("ZZZZ");
  
  // Extract just the timezone name (e.g., America/New_York -> New York)
  const tzName = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  
  return { 
    time, 
    timezone: tzName,
    tzAbbr
  };
}

/**
 * Helper function to debug timezone issues by showing both UTC and local time
 */
export function debugTimeConversion(date: Date | string, tz: string): string {
  const dt = typeof date === "string"
    ? DateTime.fromISO(date)
    : DateTime.fromJSDate(date);
    
  const utcString = dt.toUTC().toISO();
  const localString = dt.setZone(tz).toFormat("yyyy-MM-dd HH:mm:ss ZZZZ");
  
  return `UTC: ${utcString} → Local (${tz}): ${localString}`;
}

/**
 * Critical function for rink scheduling: Keeps the same local time regardless of timezone
 * Use this when displaying times for physical location events like rink sessions
 * 
 * @param utcTime - The UTC time to convert (can be Date object or ISO string)
 * @param rinkTimezone - The IANA timezone of the rink (e.g., 'America/Los_Angeles')
 * @param userTimezone - Optional: the user's timezone if different from the rink
 * @param fmt - Format string for time display (default: 'h:mm a')
 */
export function displayInRinkLocalTime(utcTime: Date | string, rinkTimezone: string, userTimezone?: string, fmt = "h:mm a") {
  try {
    // First, get the time in the rink's timezone
    const rinkTime = typeof utcTime === "string"
      ? DateTime.fromISO(utcTime, { zone: "utc" }).setZone(rinkTimezone)
      : DateTime.fromJSDate(utcTime, { zone: "utc" }).setZone(rinkTimezone);
    
    if (!rinkTime.isValid) {
      console.error("Invalid date for displayInRinkLocalTime:", utcTime);
      throw new Error("Invalid date");
    }
    
    // Build the return object
    const result: {
      formattedTime: string;
      timezone: string;
      hour: number;
      minute: number;
      dateTime: DateTime;
      userTime?: string;
      userTimezone?: string;
      userDateTime?: DateTime;
    } = {
      formattedTime: rinkTime.toFormat(fmt),
      timezone: rinkTime.toFormat("ZZZZ"),
      hour: rinkTime.hour,
      minute: rinkTime.minute,
      dateTime: rinkTime
    };
    
    // Add user timezone info if provided
    if (userTimezone) {
      const userTime = rinkTime.setZone(userTimezone, { keepLocalTime: true });
      result.userTime = userTime.toFormat(fmt);
      result.userTimezone = userTime.toFormat("ZZZZ");
      result.userDateTime = userTime;
    }
    
    return result;
  } catch (error) {
    console.error("Error in displayInRinkLocalTime:", error);
    // Return a fallback object
    return {
      formattedTime: "Invalid time",
      timezone: rinkTimezone,
      dateTime: DateTime.now().setZone(rinkTimezone)
    };
  }
}

/**
 * Simplified version of displayInRinkLocalTime for calendar displays
 * Takes only a UTC time and a rink timezone and formats it accordingly
 */
export function formatRinkLocalTime(utcTime: Date | string, rinkTimezone: string, fmt = "h:mm a") {
  try {
    // Convert to Luxon DateTime and set to the rink's timezone
    const dt = typeof utcTime === "string" 
      ? DateTime.fromISO(utcTime, { zone: "utc" }).setZone(rinkTimezone)
      : DateTime.fromJSDate(utcTime, { zone: "utc" }).setZone(rinkTimezone);
    
    return {
      formatted: dt.toFormat(fmt),
      dateTime: dt
    };
  } catch (error) {
    console.error("Error formatting time in rink timezone:", error);
    return {
      formatted: "Invalid time",
      dateTime: DateTime.now()
    };
  }
}