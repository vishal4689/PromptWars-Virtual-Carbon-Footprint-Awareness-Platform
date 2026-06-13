/**
 * Encryption & Security Utilities
 * Handles data encryption, hashing, and secure operations
 * @module utils/encryption
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Encryption service for sensitive data
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  private iv: Buffer;

  constructor(secretKey: string = process.env.ENCRYPTION_KEY || 'default-key-change-in-prod') {
    // Derive key from secret
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
    this.iv = crypto.randomBytes(16);
  }

  /**
   * Encrypt sensitive data
   * @param data Data to encrypt
   * @returns Encrypted string
   */
  encrypt(data: string): string {
    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv) as crypto.CipherGCM;
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      return `${this.iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData Encrypted string
   * @returns Decrypted data
   */
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      const ivHex = parts[0];
      const authTagHex = parts[1];
      const encrypted = parts[2];
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      let decrypted: string = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }
}

/**
 * Hash and verify passwords
 */
export class PasswordService {
  /**
   * Hash password
   * @param password Plain password
   * @returns Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   * @param password Plain password
   * @param hash Hashed password
   * @returns Is valid
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * @param password Password to validate
   * @returns Strength score 0-100
   */
  static calculatePasswordStrength(password: string): number {
    let score = 0;

    // Length
    if (password.length >= 8) {
      score += 20;
    }
    if (password.length >= 12) {
      score += 10;
    }
    if (password.length >= 16) {
      score += 10;
    }

    // Character variety
    if (/[a-z]/.test(password)) {
      score += 15;
    }
    if (/[A-Z]/.test(password)) {
      score += 15;
    }
    if (/[0-9]/.test(password)) {
      score += 15;
    }
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 15;
    }

    return Math.min(100, score);
  }
}

/**
 * Token generation and validation
 */
export class TokenService {
  /**
   * Generate random token
   * @param length Token length
   * @returns Random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate OTP
   * @param length OTP length
   * @returns Numeric OTP
   */
  static generateOTP(length: number = 6): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  }

  /**
   * Hash token for storage
   * @param token Token to hash
   * @returns Token hash
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify token hash
   * @param token Plain token
   * @param hash Token hash
   * @returns Is valid
   */
  static verifyTokenHash(token: string, hash: string): boolean {
    return this.hashToken(token) === hash;
  }
}

/**
 * CORS and security token generation
 */
export class SecurityService {
  /**
   * Generate CSRF token
   * @returns CSRF token
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify CSRF token
   * @param token Token from request
   * @param sessionToken Token from session
   * @returns Is valid
   */
  static verifyCSRFToken(token: string, sessionToken: string): boolean {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));
  }

  /**
   * Generate API key
   * @returns API key
   */
  static generateAPIKey(): { key: string; hash: string } {
    const key = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return { key, hash };
  }

  /**
   * Hash sensitive data for logging
   * @param data Data to hash
   * @returns SHA-256 hash
   */
  static hashForLogging(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
  }
}

export default {
  EncryptionService,
  PasswordService,
  TokenService,
  SecurityService,
};
