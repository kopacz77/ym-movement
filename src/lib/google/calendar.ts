import { JWT } from "google-auth-library";
// src/lib/google/calendar.ts
import { google } from "googleapis";

// Initialize Google Auth client with service account credentials
const getAuthClient = () => {
  try {
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    if (!credentials.client_email || !credentials.private_key) {
      console.error("Missing Google API credentials");
      return null;
    }

    // Log only non-sensitive information for debugging
    console.log(`Google Calendar API initialized for: ${credentials.client_email}`);

    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
      // Use the calendar owner's email from env variable
      subject: process.env.GOOGLE_CALENDAR_ID || "yuraxmin@gmail.com",
    });

    return client;
  } catch (error) {
    console.error("Error initializing Google Auth client:", error);
    return null;
  }
};

// Get Google Calendar API client
const getCalendarApi = () => {
  const auth = getAuthClient();
  if (!auth) {
    return null;
  }
  return google.calendar({ version: "v3", auth });
};

// Format attendee for Google Calendar API
const formatAttendee = (email: string, displayName?: string) => {
  return {
    email,
    displayName: displayName || email,
    responseStatus: "needsAction",
  };
};

// Google Calendar integration functions
export const googleCalendar = {
  /**
   * Creates a calendar event with proper timezone handling
   */
  createEvent: async ({
    summary,
    description,
    startTime,
    endTime,
    attendees = [],
    location,
    timeZone, // Required parameter for timezone handling
  }: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees?: Array<{ email: string; name?: string }>;
    location?: string;
    timeZone: string; // Rink's timezone
  }): Promise<string | null> => {
    try {
      console.log(`[CALENDAR] Creating event: ${summary}`);
      console.log(`[CALENDAR] Using timezone: ${timeZone}`);

      const calendar = getCalendarApi();
      if (!calendar) {
        console.error("[CALENDAR] Failed to initialize Google Calendar API");
        return null;
      }

      // Format attendees for Google Calendar API
      const formattedAttendees = attendees.map((attendee) =>
        formatAttendee(attendee.email, attendee.name),
      );

      // Create the event with explicit timezone handling
      const event = {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: timeZone, // Use the rink's timezone for start time
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: timeZone, // Use the rink's timezone for end time
        },
        location,
        attendees: formattedAttendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      };

      console.log(
        `[CALENDAR] Creating event from ${startTime.toISOString()} to ${endTime.toISOString()}`,
      );
      console.log(`[CALENDAR] Event timezone: ${timeZone}`);

      // Insert the event directly into Yura's calendar and send notifications
      const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || "yuraxmin@gmail.com",
        requestBody: event,
        sendUpdates: "all", // Make sure to send email notifications
        supportsAttachments: false,
      });

      if (response.data.id) {
        console.log(`[CALENDAR] Event created with ID: ${response.data.id}`);
        return response.data.id;
      }

      console.error("[CALENDAR] Event created but no ID returned");
      return null;
    } catch (error) {
      console.error("[CALENDAR] Error creating event:", error);
      return null;
    }
  },

  /**
   * Deletes a calendar event by ID
   */
  deleteEvent: async (eventId: string): Promise<boolean> => {
    try {
      console.log(`[CALENDAR] Deleting event: ${eventId}`);

      const calendar = getCalendarApi();
      if (!calendar) {
        console.error("[CALENDAR] Failed to initialize Google Calendar API");
        return false;
      }

      await calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID || "yuraxmin@gmail.com",
        eventId,
      });

      console.log(`[CALENDAR] Event deleted: ${eventId}`);
      return true;
    } catch (error) {
      console.error(`[CALENDAR] Error deleting event ${eventId}:`, error);
      return false;
    }
  },

  /**
   * Updates a calendar event
   */
  updateEvent: async ({
    eventId,
    summary,
    description,
    startTime,
    endTime,
    attendees = [],
    location,
    timeZone,
  }: {
    eventId: string;
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees?: Array<{ email: string; name?: string }>;
    location?: string;
    timeZone: string;
  }): Promise<string | null> => {
    try {
      console.log(`[CALENDAR] Updating event: ${eventId}`);

      const calendar = getCalendarApi();
      if (!calendar) {
        console.error("[CALENDAR] Failed to initialize Google Calendar API");
        return null;
      }

      // Format attendees for Google Calendar API
      const formattedAttendees = attendees.map((attendee) =>
        formatAttendee(attendee.email, attendee.name),
      );

      // Update the event
      const event = {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: timeZone, // Use the rink's timezone for start time
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: timeZone, // Use the rink's timezone for end time
        },
        location,
        attendees: formattedAttendees,
      };

      const response = await calendar.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID || "yuraxmin@gmail.com",
        eventId,
        requestBody: event,
        sendUpdates: "all", // Make sure to send email notifications
      });

      if (response.data.id) {
        console.log(`[CALENDAR] Event updated: ${response.data.id}`);
        return response.data.id;
      }

      console.error("[CALENDAR] Event updated but no ID returned");
      return null;
    } catch (error) {
      console.error(`[CALENDAR] Error updating event ${eventId}:`, error);
      return null;
    }
  },
};
