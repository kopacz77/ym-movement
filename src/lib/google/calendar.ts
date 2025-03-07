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

      // Better logging for debugging
      if (!clientEmail) console.warn("Missing GOOGLE_CLIENT_EMAIL in environment variables");
      if (!privateKey) console.warn("Missing GOOGLE_PRIVATE_KEY in environment variables");
      if (!calendarId) console.warn("Missing GOOGLE_CALENDAR_ID in environment variables");

      // Check if credentials are available
      if (!clientEmail || !privateKey || !calendarId) {
        console.warn("Google Calendar integration disabled due to missing credentials");
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
      
      // Test connection immediately
      try {
        const testCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        console.log(`Testing Google Calendar connection with calendar ID: ${testCalendarId}`);
        
        const result = await this.calendar.events.list({
          calendarId: testCalendarId,
          maxResults: 1,
        });
        
        console.log('Calendar connection verified successfully');
        this.initialized = true;
      } catch (testError) {
        console.error('Calendar test connection failed:', this.getErrorMessage(testError));
        if (testError && typeof testError === 'object' && 'response' in testError) {
          const apiError = testError as { response?: { data?: unknown, status?: number } };
          if (apiError.response) {
            console.error('Response data:', apiError.response.data);
            console.error('Response status:', apiError.response.status);
          }
        }
        this.initialized = false;
        this.calendar = null;
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
  
      // Get calendar ID from environment variables
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      console.log(`Creating event in calendar: ${calendarId}`);
  
      // Create a simplified event object without attendees or organizer
      const eventData = {
        summary: bookingData.summary,
        description: bookingData.description + 
                    `\n\nStudent Email: ${bookingData.attendees[0]?.email || 'Not provided'}`,
        start: {
          dateTime: bookingData.startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: bookingData.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        location: bookingData.location,
      };
      
      console.log('Attempting to create event with data:', JSON.stringify({
        calendarId,
        summary: eventData.summary,
        startTime: eventData.start.dateTime,
        endTime: eventData.end.dateTime,
      }, null, 2));
  
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: eventData,
        sendUpdates: 'none'
      });
      
      console.log('Event created successfully, ID:', response.data.id);
      return response.data.id || null;
    } catch (error) {
      this.logCalendarError('creating calendar event', error);
      // Remaining error handling code...
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
      console.log(`Updating event ${eventId} in calendar: ${calendarId}`);

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
      };

      await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData,
      });
      
      console.log('Event updated successfully, ID:', eventId);
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
      console.log(`Deleting event ${eventId} from calendar: ${calendarId}`);

      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
      
      console.log('Event deleted successfully, ID:', eventId);
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
      console.log(`Testing connection to calendar: ${calendarId}`);
      
      const result = await this.calendar.events.list({
        calendarId,
        maxResults: 1,
      });
      
      console.log('Calendar test successful, found', result.data.items?.length || 0, 'events');
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
    if (error && typeof error === 'object' && 'message' in error && 
        typeof error.message === 'string') {
      return error.message;
    }
    return String(error);
  }
}

// Export a singleton instance
export const googleCalendar = new GoogleCalendarService();