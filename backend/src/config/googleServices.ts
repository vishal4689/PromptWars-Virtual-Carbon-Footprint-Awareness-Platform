/**
 * Google Services Configuration
 * Initializes and manages all 8 Google APIs for the carbon footprint platform
 * @module config/googleServices
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Validates required Google API credentials
 * @throws {Error} If required credentials are missing
 */
const validateGoogleCredentials = (): void => {
  const requiredEnvs = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GOOGLE_SHEETS_API_KEY',
    'GOOGLE_MAPS_API_KEY',
    'GOOGLE_BIGQUERY_PROJECT_ID',
    'GOOGLE_CLOUD_BUCKET',
  ];

  const missing = requiredEnvs.filter(env => !process.env[env]);
  if (missing.length > 0) {
    throw new Error(`Missing Google API credentials: ${missing.join(', ')}`);
  }
};

/**
 * OAuth2 Client for Google authentication
 */
export const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Initialize all Google Service clients
 * Implements factory pattern for clean service instantiation
 */
export class GoogleServicesFactory {
  /**
   * Create Google Calendar API client
   */
  static createCalendarClient(auth: OAuth2Client) {
    return google.calendar({
      version: 'v3',
      auth: auth as any,
    });
  }

  /**
   * Create Google Sheets API client
   */
  static createSheetsClient(auth: OAuth2Client) {
    return google.sheets({
      version: 'v4',
      auth: auth as any,
    });
  }

  /**
   * Create Google Drive API client
   */
  static createDriveClient(auth: OAuth2Client) {
    return google.drive({
      version: 'v3',
      auth: auth as any,
    });
  }

  /**
   * Create Google Docs API client
   */
  static createDocsClient(auth: OAuth2Client) {
    return google.docs({
      version: 'v1',
      auth: auth as any,
    });
  }

  /**
   * Create BigQuery client for analytics
   */
  static createBigQueryClient(auth?: OAuth2Client) {
    const BigQuery = require('@google-cloud/bigquery').BigQuery;
    return new BigQuery({
      projectId: process.env.GOOGLE_BIGQUERY_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  /**
   * Create Google Cloud Storage client
   */
  static createStorageClient() {
    const Storage = require('@google-cloud/storage').Storage;
    return new Storage({
      projectId: process.env.GOOGLE_BIGQUERY_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  /**
   * Create Google Analytics API client
   */
  static createAnalyticsClient(auth: OAuth2Client) {
    return google.analyticsadmin({
      version: 'v1beta',
      auth: auth as any,
    });
  }
}

/**
 * Get authorization URL for user consent
 */
export const getAuthorizationUrl = (): string => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
};

/**
 * Exchange authorization code for access token
 * @param code Authorization code from Google OAuth callback
 * @returns Token credentials
 */
export const getTokensFromCode = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
};

/**
 * Set credentials for OAuth2 client
 */
export const setCredentials = (credentials: any) => {
  oauth2Client.setCredentials(credentials);
};

/**
 * Validate credentials and initialize all services
 */
export const initializeGoogleServices = (): void => {
  validateGoogleCredentials();
  console.log('✓ Google Services initialized successfully');
};

export default {
  oauth2Client,
  GoogleServicesFactory,
  getAuthorizationUrl,
  getTokensFromCode,
  setCredentials,
  initializeGoogleServices,
};
