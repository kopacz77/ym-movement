import { google, calendar_v3 } from 'googleapis';

// Define a proper interface for our event data
interface EventData {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: Array<{email: string}>;
  location: string;
}

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private initialized: boolean = false;

  constructor() {
    try {
      console.log("Initializing Google Calendar service...");
      
      // Get credentials from environment variables
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
      const calendarId = process.env.GOOGLE_CALENDAR_ID;
      
      // Check if credentials are available
      if (!clientEmail || !privateKey) {
        console.warn("Missing Google Calendar credentials in environment variables");
        this.calendar = {} as calendar_v3.Calendar;
        return;
      }
      
      // Process the private key (handle escaped newlines)
      if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      // Create auth client with service account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.initialized = true;
      console.log(`Google Calendar service initialized successfully (Calendar ID: ${calendarId || 'primary'})`);
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
      this.calendar = {} as calendar_v3.Calendar;
    }
  }

  async createEvent(bookingData: EventData): Promise<string | null> {
    try {
      // Check if service is properly initialized
      if (!this.initialized || !this.calendar.events) {
        console.warn('Google Calendar service not properly initialized, skipping event creation');
        return null;
      }

      console.log("Creating calendar event...");
      
      // Get calendar ID from environment variables or default to primary
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      const response = await this.calendar.events.insert({
        calendarId,
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
        },
      });
      
      console.log(`Calendar event created with ID: ${response.data.id}`);
      return response.data.id || null;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  async updateEvent(eventId: string, bookingData: EventData): Promise<boolean> {
    try {
      // Check if service is properly initialized
      if (!this.initialized || !this.calendar.events) {
        console.warn('Google Calendar service not properly initialized, skipping event update');
        return false;
      }

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await this.calendar.events.update({
        calendarId,
        eventId,
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
        },
      });
      
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // Check if service is properly initialized
      if (!this.initialized || !this.calendar.events) {
        console.warn('Google Calendar service not properly initialized, skipping event deletion');
        return false;
      }

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  // Helper method to check if the calendar integration is working
  async testConnection(): Promise<{success: boolean, message: string}> {
    if (!this.initialized) {
      return {
        success: false,
        message: 'Calendar service not initialized due to missing credentials'
      };
    }
    
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      await this.calendar.events.list({
        calendarId,
        maxResults: 1,
      });
      
      return {
        success: true,
        message: 'Successfully connected to Google Calendar'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Google Calendar: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// Export a singleton instance
export const googleCalendar = new GoogleCalendarService();