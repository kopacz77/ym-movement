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

// Define response types for better type safety
interface CalendarResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Service for interacting with Google Calendar API
 */
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initializeCalendar();
  }

  private async initializeCalendar(): Promise<void> {
    try {
      console.log("Initializing Google Calendar service...");
      
      // Get credentials from environment variables
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
      const calendarId = process.env.GOOGLE_CALENDAR_ID;

      // Check if credentials are available
      if (!clientEmail || !privateKey) {
        console.warn("Missing Google Calendar credentials in environment variables");
        return;
      }

      // Enhanced private key handling
      privateKey = privateKey
        .replace(/\\n/g, '\n')
        .replace(/"-----/g, '-----')
        .replace(/-----"/g, '-----');
      
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
      
      // Test connection immediately
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        console.error('Calendar test connection failed:', connectionTest.error);
      } else {
        console.log('Calendar connection verified successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize Google Calendar service:', errorMessage);
      this.calendar = null;
    }
  }

  /**
   * Ensures the service is initialized before operations
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    
    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.initialized;
    }
    
    return false;
  }

  /**
   * Creates a new calendar event
   */
  async createEvent(bookingData: EventData): Promise<string | null> {
    try {
      // Check if service is properly initialized
      const isReady = await this.ensureInitialized();
      if (!isReady || !this.calendar) {
        console.warn('Google Calendar service not properly initialized, skipping event creation');
        return null;
      }

      // Get calendar ID from environment variables or default to primary
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const eventData = {
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
      };

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: eventData,
      });

      return response.data.id || null;
    } catch (error) {
      this.logCalendarError('creating calendar event', error);
      return null;
    }
  }

  /**
   * Updates an existing calendar event
   */
  async updateEvent(eventId: string, bookingData: EventData): Promise<boolean> {
    try {
      const isReady = await this.ensureInitialized();
      if (!isReady || !this.calendar) {
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
      this.logCalendarError('updating calendar event', error);
      return false;
    }
  }

  /**
   * Deletes a calendar event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const isReady = await this.ensureInitialized();
      if (!isReady || !this.calendar) {
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
      this.logCalendarError('deleting calendar event', error);
      return false;
    }
  }

  /**
   * Tests connection to the calendar service
   */
  async testConnection(): Promise<CalendarResponse<void>> {
    if (!this.calendar) {
      return {
        success: false,
        error: 'Calendar service not initialized due to missing credentials'
      };
    }

    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const result = await this.calendar.events.list({
        calendarId,
        maxResults: 1,
      });
      
      return { success: true };
    } catch (error) {
      this.logCalendarError('testing calendar connection', error);
      return {
        success: false,
        error: `Failed to connect to Google Calendar: ${this.getErrorMessage(error)}`
      };
    }
  }

  /**
   * Enhanced error logging for calendar operations
   */
  private logCalendarError(operation: string, error: unknown): void {
    console.error(`Error ${operation}:`, error);
    
    // Log additional error details if available
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { data?: unknown, status?: number } };
      if (apiError.response) {
        console.error('Response data:', apiError.response.data);
        console.error('Response status:', apiError.response.status);
      }
    }
  }

  /**
   * Safely extracts error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return String(error);
  }
}

// Export a singleton instance
export const googleCalendar = new GoogleCalendarService();