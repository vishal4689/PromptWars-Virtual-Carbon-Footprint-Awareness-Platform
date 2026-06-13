/**
 * Google Calendar Integration Service
 * Syncs user calendar events and tracks carbon impact
 * @module services/googleCalendarService
 */

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { CarbonCalculator } from './carbonCalculator';

/**
 * Calendar event with carbon tracking
 */
export interface CalendarEventWithCarbon {
  eventId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  carbonImpact?: {
    estimated: number;
    activities: string[];
  };
}

/**
 * GoogleCalendarService
 * Integrates with Google Calendar API for:
 * - Event synchronization
 * - Eco-friendly event scheduling
 * - Carbon tracking for calendar activities
 */
export class GoogleCalendarService {
  private calendar: any;
  private userId: string;

  constructor(auth: OAuth2Client, userId: string) {
    this.calendar = google.calendar({ version: 'v3', auth: auth as any });
    this.userId = userId;
  }

  /**
   * Sync user's calendar events
   * @param maxResults Maximum number of events to retrieve
   * @returns Array of calendar events with carbon estimates
   */
  async syncCalendarEvents(maxResults: number = 50): Promise<CalendarEventWithCarbon[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        maxResults,
        orderBy: 'startTime',
        singleEvents: true,
        timeMin: new Date().toISOString(),
      });

      const events = response.data.items || [];
      return this.enrichEventsWithCarbonData(events);
    } catch (error) {
      throw new Error(`Failed to sync calendar events: ${error}`);
    }
  }

  /**
   * Enrich calendar events with carbon impact estimates
   * @param events Raw calendar events
   * @returns Events with carbon impact data
   */
  private async enrichEventsWithCarbonData(
    events: any[]
  ): Promise<CalendarEventWithCarbon[]> {
    return events.map(event => {
      const carbonImpact = this.estimateEventCarbon(event);
      return {
        eventId: event.id,
        title: event.summary,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        location: event.location,
        carbonImpact,
      };
    });
  }

  /**
   * Estimate carbon impact based on event type and location
   * @param event Calendar event
   * @returns Carbon impact estimate
   */
  private estimateEventCarbon(event: any): { estimated: number; activities: string[] } {
    const activities: string[] = [];
    let estimated = 0;

    const title = event.summary?.toLowerCase() || '';

    // Travel-related events
    if (
      title.includes('meeting') ||
      title.includes('conference') ||
      title.includes('commute')
    ) {
      estimated += 2; // Assume travel
      activities.push('Travel');
    }

    // Flight-related events
    if (title.includes('flight') || title.includes('airport')) {
      estimated += 50;
      activities.push('Air Travel');
    }

    // Food events
    if (
      title.includes('lunch') ||
      title.includes('dinner') ||
      title.includes('restaurant')
    ) {
      estimated += 1;
      activities.push('Meal');
    }

    // Shopping events
    if (title.includes('shopping') || title.includes('mall')) {
      estimated += 3;
      activities.push('Shopping');
    }

    return { estimated, activities };
  }

  /**
   * Create an eco-friendly event suggestion
   * @param eventTitle Title of the event
   * @param date Date for the event
   * @returns Calendar event to create
   */
  async createEcoEvent(eventTitle: string, date: Date): Promise<string> {
    try {
      const event = {
        summary: `🌱 ${eventTitle}`,
        description:
          'This is an eco-friendly event. Remember to minimize your carbon footprint!',
        start: {
          dateTime: date.toISOString(),
        },
        end: {
          dateTime: new Date(date.getTime() + 60 * 60 * 1000).toISOString(),
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to create eco event: ${error}`);
    }
  }

  /**
   * Add carbon reduction reminders to events
   * @param eventId Event to update
   * @returns Updated event
   */
  async addCarbonReminder(eventId: string): Promise<void> {
    try {
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      const updatedDescription = `${event.data.description || ''}\n\n💚 Carbon Tip: Consider eco-friendly alternatives for this activity!`;

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: {
          ...event.data,
          description: updatedDescription,
        },
      });
    } catch (error) {
      throw new Error(`Failed to add carbon reminder: ${error}`);
    }
  }

  /**
   * Get daily carbon impact from calendar
   * @param date Date to analyze
   * @returns Total estimated carbon for the day
   */
  async getDailyImpact(date: Date): Promise<number> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
      });

      const events = response.data.items || [];
      const totalImpact = events.reduce((sum: number, event: any) => {
        return sum + (this.estimateEventCarbon(event).estimated || 0);
      }, 0);

      return totalImpact;
    } catch (error) {
      throw new Error(`Failed to calculate daily impact: ${error}`);
    }
  }
}

export default GoogleCalendarService;
