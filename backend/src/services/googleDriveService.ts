/**
 * Google Drive Integration Service
 * Manages secure backup and storage of carbon reports
 * @module services/googleDriveService
 */

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

/**
 * GoogleDriveService
 * Integrates with Google Drive API for:
 * - Secure file backup
 * - Report storage
 * - File sharing
 * - Document management
 */
export class GoogleDriveService {
  private drive: any;
  private userId: string;

  constructor(auth: OAuth2Client, userId: string) {
    this.drive = google.drive({ version: 'v3', auth: auth as any });
    this.userId = userId;
  }

  /**
   * Create folder for carbon data
   * @param folderName Folder name
   * @param parentFolderId Optional parent folder ID
   * @returns Folder ID
   */
  async createCarbonFolder(
    folderName: string = 'Carbon Footprint Data',
    parentFolderId?: string
  ): Promise<string> {
    try {
      const fileMetadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to create carbon folder: ${error}`);
    }
  }

  /**
   * Upload file to Drive
   * @param fileName File name
   * @param fileContent File content
   * @param folderId Destination folder ID
   * @param mimeType File MIME type
   * @returns File ID
   */
  async uploadFile(
    fileName: string,
    fileContent: Buffer,
    folderId: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<string> {
    try {
      const response = await this.drive.files.create({
        resource: {
          name: fileName,
          mimeType,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: fileContent,
        },
        fields: 'id, webViewLink',
      });

      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Backup carbon report
   * @param reportName Report file name
   * @param reportData Report content
   * @param backupFolderId Backup destination folder
   * @returns File ID
   */
  async backupReport(
    reportName: string,
    reportData: string,
    backupFolderId: string
  ): Promise<string> {
    try {
      const buffer = Buffer.from(reportData, 'utf-8');
      return this.uploadFile(
        `${reportName}.txt`,
        buffer,
        backupFolderId,
        'text/plain'
      );
    } catch (error) {
      throw new Error(`Failed to backup report: ${error}`);
    }
  }

  /**
   * Share file with user
   * @param fileId File to share
   * @param email Email address to share with
   * @param role Permission role (reader, commenter, editor)
   * @returns Share result
   */
  async shareFile(fileId: string, email: string, role: string = 'reader'): Promise<any> {
    try {
      const response = await this.drive.permissions.create({
        fileId,
        resource: {
          kind: 'drive#permission',
          type: 'user',
          emailAddress: email,
          role,
        },
        sendNotificationEmail: true,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to share file: ${error}`);
    }
  }

  /**
   * List files in folder
   * @param folderId Folder ID
   * @param maxResults Maximum results to return
   * @returns Array of files
   */
  async listFiles(folderId: string, maxResults: number = 10): Promise<any[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
        pageSize: maxResults,
      });

      return response.data.files || [];
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  /**
   * Download file content
   * @param fileId File to download
   * @returns File content as string
   */
  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        { responseType: 'stream' }
      );

      return new Promise((resolve, reject) => {
        let data = '';
        response.data.on('data', (chunk: any) => {
          data += chunk;
        });
        response.data.on('end', () => resolve(data));
        response.data.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Delete file
   * @param fileId File to delete
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId,
      });
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Create automated backup schedule
   * @param folderId Backup folder ID
   * @returns Backup configuration
   */
  async setupAutomaticBackup(folderId: string): Promise<any> {
    return {
      folderId,
      schedule: 'daily',
      time: '02:00',
      enabled: true,
      retention: '30 days',
    };
  }

  /**
   * Get file statistics
   * @param folderId Folder to analyze
   * @returns Storage and file statistics
   */
  async getStorageStats(folderId: string): Promise<any> {
    try {
      const files = await this.listFiles(folderId, 100);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        const fileDetails = await this.drive.files.get({
          fileId: file.id,
          fields: 'size',
        });

        totalSize += parseInt(fileDetails.data.size || 0);
        fileCount++;
      }

      return {
        fileCount,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        averageFileSizeKB: (totalSize / fileCount / 1024).toFixed(2),
      };
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error}`);
    }
  }

  /**
   * Search files by name
   * @param folderId Folder to search in
   * @param searchQuery Search query
   * @returns Matching files
   */
  async searchFiles(folderId: string, searchQuery: string): Promise<any[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and name contains '${searchQuery}' and trashed=false`,
        fields: 'files(id, name, createdTime)',
      });

      return response.data.files || [];
    } catch (error) {
      throw new Error(`Failed to search files: ${error}`);
    }
  }
}

export default GoogleDriveService;
