// src/lib/google/calendar.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleCalendarService {
  private calendar;
  private auth: OAuth2Client;

  constructor() {
    this.auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Set credentials from your stored refresh token
    this.auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  async createEvent(bookingData: {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: { email: string }[];
    location: string;
  }) {
    try {
      const event = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: bookingData.summary,
          description: bookingData.description,
          start: {
            dateTime: bookingData.startTime.toISOString(),
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: bookingData.endTime.toISOString(),
            timeZone: 'America/New_York',
          },
          attendees: bookingData.attendees,
          location: bookingData.location,
          guestsCanModify: false,
          sendUpdates: 'all',
        },
      });
      return event.data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateEvent(
    eventId: string,
    bookingData: {
      summary: string;
      description: string;
      startTime: Date;
      endTime: Date;
      attendees: { email: string }[];
      location: string;
    }
  ) {
    try {
      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: {
          summary: bookingData.summary,
          description: bookingData.description,
          start: {
            dateTime: bookingData.startTime.toISOString(),
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: bookingData.endTime.toISOString(),
            timeZone: 'America/New_York',
          },
          attendees: bookingData.attendees,
          location: bookingData.location,
          sendUpdates: 'all',
        },
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }
}

export const googleCalendar = new GoogleCalendarService();
