/**
 * Google Sheets Integration Service
 * Stores and analyzes carbon footprint data
 * @module services/googleSheetsService
 */

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

/**
 * GoogleSheetsService
 * Integrates with Google Sheets API for:
 * - Storing historical carbon data
 * - Generating analysis reports
 * - Exporting user data
 * - Real-time collaboration
 */
export class GoogleSheetsService {
  private sheets: any;
  private userId: string;

  constructor(auth: OAuth2Client, userId: string) {
    this.sheets = google.sheets({ version: 'v4', auth });
    this.userId = userId;
  }

  /**
   * Create a new spreadsheet for user carbon data
   * @param title Title of the spreadsheet
   * @returns Spreadsheet ID
   */
  async createCarbonDataSheet(title: string): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: `${title} - Carbon Footprint Tracker`,
            locale: 'en_US',
            timeZone: 'UTC',
          },
          sheets: [
            {
              properties: {
                sheetType: 'GRID',
                title: 'Activity Log',
              },
            },
            {
              properties: {
                sheetType: 'GRID',
                title: 'Monthly Summary',
              },
            },
            {
              properties: {
                sheetType: 'GRID',
                title: 'Analytics',
              },
            },
          ],
        },
      });

      const spreadsheetId = response.data.spreadsheetId;
      await this.initializeSheetHeaders(spreadsheetId);
      return spreadsheetId;
    } catch (error) {
      throw new Error(`Failed to create carbon data sheet: ${error}`);
    }
  }

  /**
   * Initialize sheet with headers
   * @param spreadsheetId Spreadsheet ID
   */
  private async initializeSheetHeaders(spreadsheetId: string): Promise<void> {
    const headerData = {
      data: [
        {
          range: "'Activity Log'!A1:G1",
          values: [
            [
              'Date',
              'Activity Type',
              'Category',
              'Quantity',
              'Unit',
              'CO2 (kg)',
              'Notes',
            ],
          ],
        },
        {
          range: "'Monthly Summary'!A1:E1",
          values: [
            ['Month', 'Total CO2 (kg)', 'Average Daily', 'Highest Day', 'Trend'],
          ],
        },
        {
          range: "'Analytics'!A1:D1",
          values: [['Metric', 'Value', 'Target', 'Progress %']],
        },
      ],
    };

    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: headerData,
    });
  }

  /**
   * Append activity record to spreadsheet
   * @param spreadsheetId Spreadsheet ID
   * @param activity Activity data to log
   */
  async logActivity(
    spreadsheetId: string,
    activity: {
      date: string;
      type: string;
      category: string;
      quantity: number;
      unit: string;
      carbonKg: number;
      notes?: string;
    }
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Activity Log'!A:G",
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [
            [
              activity.date,
              activity.type,
              activity.category,
              activity.quantity,
              activity.unit,
              activity.carbonKg,
              activity.notes || '',
            ],
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to log activity: ${error}`);
    }
  }

  /**
   * Get monthly summary data
   * @param spreadsheetId Spreadsheet ID
   * @returns Monthly analysis
   */
  async getMonthlySummary(spreadsheetId: string): Promise<any> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Monthly Summary'",
      });

      return response.data.values;
    } catch (error) {
      throw new Error(`Failed to get monthly summary: ${error}`);
    }
  }

  /**
   * Update monthly statistics
   * @param spreadsheetId Spreadsheet ID
   * @param month Month string
   * @param stats Statistics to update
   */
  async updateMonthlySummary(
    spreadsheetId: string,
    month: string,
    stats: {
      totalCO2: number;
      averageDaily: number;
      highestDay: number;
      trend: string;
    }
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Monthly Summary'!A:E",
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [
            [month, stats.totalCO2, stats.averageDaily, stats.highestDay, stats.trend],
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to update monthly summary: ${error}`);
    }
  }

  /**
   * Export user data to CSV format
   * @param spreadsheetId Spreadsheet ID
   * @returns CSV export URL
   */
  async exportToCSV(spreadsheetId: string): Promise<string> {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  }

  /**
   * Share spreadsheet with others
   * @param spreadsheetId Spreadsheet ID
   * @param email Email to share with
   * @param role Permission role (reader, commenter, editor)
   */
  async shareSpreadsheet(
    spreadsheetId: string,
    email: string,
    role: string = 'reader'
  ): Promise<void> {
    try {
      const drive = google.drive({ version: 'v3' });
      await drive.permissions.create({
        fileId: spreadsheetId,
        resource: {
          kind: 'drive#permission',
          type: 'user',
          emailAddress: email,
          role,
        },
        sendNotificationEmail: true,
      });
    } catch (error) {
      throw new Error(`Failed to share spreadsheet: ${error}`);
    }
  }

  /**
   * Batch append multiple activities
   * @param spreadsheetId Spreadsheet ID
   * @param activities Array of activities to log
   */
  async batchLogActivities(spreadsheetId: string, activities: any[]): Promise<void> {
    try {
      const values = activities.map(activity => [
        activity.date,
        activity.type,
        activity.category,
        activity.quantity,
        activity.unit,
        activity.carbonKg,
        activity.notes || '',
      ]);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Activity Log'!A:G",
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });
    } catch (error) {
      throw new Error(`Failed to batch log activities: ${error}`);
    }
  }

  /**
   * Create pivot table for analytics
   * @param spreadsheetId Spreadsheet ID
   * @returns Pivot table ID
   */
  async createAnalyticsPivotTable(spreadsheetId: string): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              createPivotTable: {
                source: {
                  sheetId: 0,
                  rowData: [{ values: [] }],
                },
                destination: {
                  sheetId: 2,
                },
                rows: [{ sourceColumnOffset: 1 }],
                columns: [{ sourceColumnOffset: 5 }],
                values: [{ sourceColumnOffset: 5, summarizeFunction: 'SUM' }],
              },
            },
          ],
        },
      });

      return response.data.replies[0].createPivotTable?.pivotTable?.pivotTableId || 0;
    } catch (error) {
      throw new Error(`Failed to create pivot table: ${error}`);
    }
  }
}

export default GoogleSheetsService;
