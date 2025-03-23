// src/lib/google/calendar.ts
import { google } from "googleapis";
import { randomUUID } from "node:crypto";

// Load the Google Calendar credentials from environment variables
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const YURA_EMAIL = process.env.YURA_EMAIL || "yuraxming@gmail.com";

// Create a Google Calendar client
const calendar = google.calendar("v3");
const auth = new google.auth.JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

interface EventOptions {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: { email: string }[];
  location?: string;
  timeZone?: string; // Add explicit timezone parameter
}

export const googleCalendar = {
  /**
   * Create a new event in Google Calendar
   */
  async createEvent(options: EventOptions): Promise<string | null> {
    try {
      if (!CALENDAR_ID) {
        console.error("Google Calendar ID not set in environment variables");
        return null;
      }

      // Use the rink's timezone or default to 'America/Los_Angeles'
      const timeZone = options.timeZone || "America/Los_Angeles";

      // Convert times to RFC3339 format with the timezone
      // This is critical - don't manipulate the date objects, just format them properly
      const event = {
        summary: options.summary,
        description: options.description,
        start: {
          dateTime: options.startTime.toISOString(),
          timeZone: timeZone,
        },
        end: {
          dateTime: options.endTime.toISOString(),
          timeZone: timeZone,
        },
        attendees: [
          ...options.attendees,
          { email: YURA_EMAIL }, // Always add Yura as an attendee
        ],
        location: options.location,
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      // Create the event
      const response = await calendar.events.insert({
        auth,
        calendarId: CALENDAR_ID,
        requestBody: event,
        conferenceDataVersion: 1,
      });

      if (response.data.id) {
        console.log(`Event created: ${response.data.htmlLink}`);
        return response.data.id;
      }

      return null;
    } catch (error) {
      console.error("Error creating Google Calendar event:", error);
      return null;
    }
  },

  /**
   * Delete an event from Google Calendar
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      if (!CALENDAR_ID) {
        console.error("Google Calendar ID not set in environment variables");
        return false;
      }

      await calendar.events.delete({
        auth,
        calendarId: CALENDAR_ID,
        eventId,
      });

      return true;
    } catch (error) {
      console.error("Error deleting Google Calendar event:", error);
      return false;
    }
  },
};
