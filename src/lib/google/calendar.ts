import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { createOAuth2Client } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";

// Type for a Coach record with Google Calendar token fields
export type CoachWithTokens = {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiresAt: Date | null;
  googleCalendarId: string | null;
};

// Format attendee for Google Calendar API
const formatAttendee = (email: string, displayName?: string) => {
  return {
    email,
    displayName: displayName || email,
    responseStatus: "needsAction",
  };
};

/**
 * Creates a Google Calendar API client for a specific coach using their OAuth2 tokens.
 * Returns null if the coach has no tokens (graceful degradation).
 * Auto-persists refreshed tokens when Google issues new ones.
 */
function getCoachCalendarApi(coach: CoachWithTokens) {
  if (!coach.googleAccessToken || !coach.googleRefreshToken) {
    console.warn(`[CALENDAR] Coach ${coach.id} has no Google Calendar tokens`);
    return null;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decrypt(coach.googleAccessToken),
    refresh_token: decrypt(coach.googleRefreshToken),
    expiry_date: coach.googleTokenExpiresAt?.getTime(),
  });

  // Auto-persist refreshed tokens when Google issues new ones
  oauth2Client.on("tokens", (tokens) => {
    const updateData: Record<string, unknown> = {};

    if (tokens.access_token) {
      updateData.googleAccessToken = encrypt(tokens.access_token);
    }
    if (tokens.refresh_token) {
      updateData.googleRefreshToken = encrypt(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      updateData.googleTokenExpiresAt = new Date(tokens.expiry_date);
    }

    if (Object.keys(updateData).length > 0) {
      prisma.coach
        .update({
          where: { id: coach.id },
          data: updateData,
        })
        .catch((err) => {
          console.error(
            `[CALENDAR] Failed to persist refreshed tokens for coach ${coach.id}:`,
            err,
          );
        });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// Google Calendar integration functions (per-coach)
export const googleCalendar = {
  /**
   * Creates a calendar event on the coach's Google Calendar
   */
  createEvent: async (
    coach: CoachWithTokens,
    {
      summary,
      description,
      startTime,
      endTime,
      attendees = [],
      location,
      timeZone,
    }: {
      summary: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      attendees?: Array<{ email: string; name?: string }>;
      location?: string;
      timeZone: string;
    },
  ): Promise<string | null> => {
    try {
      console.log(`[CALENDAR] Creating event for coach ${coach.id}: ${summary}`);

      const calendar = getCoachCalendarApi(coach);
      if (!calendar) {
        console.warn(`[CALENDAR] No calendar API available for coach ${coach.id}`);
        return null;
      }

      const formattedAttendees = attendees.map((attendee) =>
        formatAttendee(attendee.email, attendee.name),
      );

      const event = {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone,
        },
        location,
        attendees: formattedAttendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email" as const, minutes: 60 },
            { method: "popup" as const, minutes: 30 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: coach.googleCalendarId || "primary",
        requestBody: event,
        sendUpdates: "all",
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
   * Deletes a calendar event from the coach's Google Calendar
   */
  deleteEvent: async (coach: CoachWithTokens, eventId: string): Promise<boolean> => {
    try {
      console.log(`[CALENDAR] Deleting event ${eventId} for coach ${coach.id}`);

      const calendar = getCoachCalendarApi(coach);
      if (!calendar) {
        console.warn(`[CALENDAR] No calendar API available for coach ${coach.id}`);
        return false;
      }

      await calendar.events.delete({
        calendarId: coach.googleCalendarId || "primary",
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
   * Updates a calendar event on the coach's Google Calendar
   */
  updateEvent: async (
    coach: CoachWithTokens,
    {
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
    },
  ): Promise<string | null> => {
    try {
      console.log(`[CALENDAR] Updating event ${eventId} for coach ${coach.id}`);

      const calendar = getCoachCalendarApi(coach);
      if (!calendar) {
        console.warn(`[CALENDAR] No calendar API available for coach ${coach.id}`);
        return null;
      }

      const formattedAttendees = attendees.map((attendee) =>
        formatAttendee(attendee.email, attendee.name),
      );

      const event = {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone,
        },
        location,
        attendees: formattedAttendees,
      };

      const response = await calendar.events.update({
        calendarId: coach.googleCalendarId || "primary",
        eventId,
        requestBody: event,
        sendUpdates: "all",
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
