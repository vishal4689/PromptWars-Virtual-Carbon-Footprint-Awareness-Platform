/**
 * Google Docs Integration Service
 * Generates personalized carbon reports and documents
 * @module services/googleDocsService
 */

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

/**
 * GoogleDocsService
 * Integrates with Google Docs API for:
 * - Personalized report generation
 * - Automated document creation
 * - Report sharing
 * - Data visualization in documents
 */
export class GoogleDocsService {
  private docs: any;
  private drive: any;
  private userId: string;

  constructor(auth: OAuth2Client, userId: string) {
    this.docs = google.docs({ version: 'v1', auth: auth as any });
    this.drive = google.drive({ version: 'v3', auth: auth as any });
    this.userId = userId;
  }

  /**
   * Create a new carbon report document
   * @param title Report title
   * @param data Report data
   * @returns Document ID
   */
  async generateCarbonReport(
    title: string,
    data: {
      userName: string;
      period: string;
      totalEmission: number;
      monthlyBreakdown: any[];
      recommendations: string[];
      achievements: string[];
    }
  ): Promise<string> {
    try {
      // Create document
      const driveResponse = await this.drive.files.create({
        resource: {
          name: `${title} - ${data.period}`,
          mimeType: 'application/vnd.google-apps.document',
        },
        fields: 'id',
      });

      const documentId = driveResponse.data.id;

      // Add content to document
      await this.addReportContent(documentId, data);

      return documentId;
    } catch (error) {
      throw new Error(`Failed to generate carbon report: ${error}`);
    }
  }

  /**
   * Add structured content to document
   * @param documentId Document ID
   * @param data Report data
   */
  private async addReportContent(documentId: string, data: any): Promise<void> {
    try {
      const requests = [
        // Title
        {
          insertText: {
            text: `🌍 Carbon Footprint Report\n${data.period}\n\n`,
            location: { index: 1 },
          },
        },
        {
          updateTextStyle: {
            range: { startIndex: 1, endIndex: 30 },
            textStyle: {
              fontSize: { magnitude: 24, unit: 'pt' },
              bold: true,
              foregroundColor: {
                color: { rgbColor: { red: 0.1, green: 0.5, blue: 0.2 } },
              },
            },
            fields: 'fontSize,bold,foregroundColor',
          },
        },

        // User info
        {
          insertText: {
            text: `User: ${data.userName}\n`,
            location: { index: 1 },
          },
        },

        // Summary
        {
          insertText: {
            text: `\nTotal Carbon Footprint: ${data.totalEmission.toFixed(2)} kg CO₂e\n\n`,
            location: { index: 1 },
          },
        },

        // Monthly breakdown
        {
          insertText: {
            text: 'Monthly Breakdown:\n',
            location: { index: 1 },
          },
        },
        ...this.createMonthlyBreakdownRequests(data.monthlyBreakdown),

        // Recommendations
        {
          insertText: {
            text: '\nRecommendations:\n',
            location: { index: 1 },
          },
        },
        ...this.createRecommendationRequests(data.recommendations),

        // Achievements
        {
          insertText: {
            text: '\nYour Achievements:\n',
            location: { index: 1 },
          },
        },
        ...this.createAchievementRequests(data.achievements),
      ];

      await this.docs.documents.batchUpdate({
        documentId,
        resource: { requests },
      });
    } catch (error) {
      throw new Error(`Failed to add report content: ${error}`);
    }
  }

  /**
   * Create monthly breakdown requests
   */
  private createMonthlyBreakdownRequests(breakdown: any[]): any[] {
    return breakdown.map(item => ({
      insertText: {
        text: `• ${item.month}: ${item.total.toFixed(2)} kg CO₂e (${item.change > 0 ? '+' : ''}${item.change}%)\n`,
        location: { index: 1 },
      },
    }));
  }

  /**
   * Create recommendation requests
   */
  private createRecommendationRequests(recommendations: string[]): any[] {
    return recommendations.map(rec => ({
      insertText: {
        text: `✓ ${rec}\n`,
        location: { index: 1 },
      },
    }));
  }

  /**
   * Create achievement requests
   */
  private createAchievementRequests(achievements: string[]): any[] {
    return achievements.map(ach => ({
      insertText: {
        text: `🏆 ${ach}\n`,
        location: { index: 1 },
      },
    }));
  }

  /**
   * Export document as PDF
   * @param documentId Document to export
   * @returns PDF URL
   */
  async exportAsPDF(documentId: string): Promise<string> {
    return `https://docs.google.com/document/d/${documentId}/export?format=pdf`;
  }

  /**
   * Share report with others
   * @param documentId Document ID
   * @param email Email to share with
   * @param role Permission role
   */
  async shareReport(documentId: string, email: string, role: string = 'viewer'): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId: documentId,
        resource: {
          kind: 'drive#permission',
          type: 'user',
          emailAddress: email,
          role,
        },
        sendNotificationEmail: true,
      });
    } catch (error) {
      throw new Error(`Failed to share report: ${error}`);
    }
  }

  /**
   * Create comparison report between periods
   * @param title Report title
   * @param period1Data First period data
   * @param period2Data Second period data
   * @returns Document ID
   */
  async generateComparisonReport(
    title: string,
    period1Data: any,
    period2Data: any
  ): Promise<string> {
    try {
      const driveResponse = await this.drive.files.create({
        resource: {
          name: `${title} - Comparison Report`,
          mimeType: 'application/vnd.google-apps.document',
        },
        fields: 'id',
      });

      const documentId = driveResponse.data.id;

      const requests = [
        {
          insertText: {
            text: `📊 Carbon Footprint Comparison Report\n\n`,
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: `${period1Data.period}: ${period1Data.total} kg CO₂e\n`,
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: `${period2Data.period}: ${period2Data.total} kg CO₂e\n`,
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: `Change: ${((period2Data.total - period1Data.total) / period1Data.total * 100).toFixed(1)}%\n`,
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: `Status: ${period2Data.total < period1Data.total ? '✅ Improved' : '⚠️ Increased'}\n`,
            location: { index: 1 },
          },
        },
      ];

      await this.docs.documents.batchUpdate({
        documentId,
        resource: { requests },
      });

      return documentId;
    } catch (error) {
      throw new Error(`Failed to generate comparison report: ${error}`);
    }
  }

  /**
   * Add image to document
   * @param documentId Document ID
   * @param imageUrl Image URL
   */
  async addImageToDocument(documentId: string, imageUrl: string): Promise<void> {
    try {
      const requests = [
        {
          insertInlineImage: {
            uri: imageUrl,
            location: { index: 1 },
          },
        },
      ];

      await this.docs.documents.batchUpdate({
        documentId,
        resource: { requests },
      });
    } catch (error) {
      throw new Error(`Failed to add image to document: ${error}`);
    }
  }

  /**
   * Create template document
   * @param templateName Template name
   * @returns Document ID
   */
  async createReportTemplate(templateName: string): Promise<string> {
    try {
      const response = await this.drive.files.create({
        resource: {
          name: `${templateName} Template`,
          mimeType: 'application/vnd.google-apps.document',
        },
        fields: 'id',
      });

      const documentId = response.data.id;

      const requests = [
        {
          insertText: {
            text: '[HEADER: Your Report Title]\n\n',
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: '[SECTION: Summary]\n\n',
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: '[SECTION: Monthly Data]\n\n',
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: '[SECTION: Recommendations]\n\n',
            location: { index: 1 },
          },
        },
      ];

      await this.docs.documents.batchUpdate({
        documentId,
        resource: { requests },
      });

      return documentId;
    } catch (error) {
      throw new Error(`Failed to create template: ${error}`);
    }
  }
}

export default GoogleDocsService;
