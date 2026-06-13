/**
 * Input Validation Unit Tests
 * Tests security and data integrity
 * @module tests/unit/validators.test
 */

import {
  validateEmail,
  validatePassword,
  sanitizeInput,
  validateActivity,
  validateLocation,
  validateDateFormat,
  validateUserProfile,
} from '../../src/utils/validators';

describe('Validators Unit Tests', () => {
  describe('Email Validation', () => {
    test('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@example.co.uk')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    test('should reject emails exceeding max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('Password Validation', () => {
    test('should accept strong passwords', () => {
      const result = validatePassword('SecurePass123!');
      expect(result.isValid).toBe(true);
      expect(result.feedback).toHaveLength(0);
    });

    test('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    test('should provide specific feedback', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.feedback.some(f => f.includes('special'))).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    test('should remove XSS attempts', () => {
      const malicious = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    test('should remove javascript protocols', () => {
      const malicious = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
      const malicious = 'onload=alert("xss")';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onload');
    });

    test('should trim whitespace', () => {
      const input = '  test  ';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('test');
    });

    test('should enforce max length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = sanitizeInput(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Activity Validation', () => {
    test('should accept valid activity', () => {
      const activity = {
        type: 'transportation',
        category: 'car',
        quantity: 10,
        unit: 'km',
        timestamp: new Date().toISOString(),
      };
      const result = validateActivity(activity);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid activity type', () => {
      const activity = {
        type: 'invalid',
        category: 'car',
        quantity: 10,
        unit: 'km',
        timestamp: new Date().toISOString(),
      };
      const result = validateActivity(activity);
      expect(result.isValid).toBe(false);
    });

    test('should reject negative quantity', () => {
      const activity = {
        type: 'transportation',
        category: 'car',
        quantity: -5,
        unit: 'km',
        timestamp: new Date().toISOString(),
      };
      const result = validateActivity(activity);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Location Validation', () => {
    test('should accept valid coordinates', () => {
      expect(validateLocation(40.7128, -74.006)).toBe(true); // NYC
      expect(validateLocation(0, 0)).toBe(true); // Equator
      expect(validateLocation(90, 180)).toBe(true); // Max valid
    });

    test('should reject invalid coordinates', () => {
      expect(validateLocation(91, 0)).toBe(false); // Latitude too high
      expect(validateLocation(0, 181)).toBe(false); // Longitude too high
      expect(validateLocation(NaN, 0)).toBe(false);
    });
  });

  describe('Date Format Validation', () => {
    test('should accept valid ISO dates', () => {
      expect(validateDateFormat('2024-01-01')).toBe(true);
      expect(validateDateFormat('2024-01-01T12:00:00Z')).toBe(true);
    });

    test('should reject invalid dates', () => {
      expect(validateDateFormat('invalid-date')).toBe(false);
      expect(validateDateFormat('2024-13-01')).toBe(false);
    });
  });

  describe('User Profile Validation', () => {
    test('should accept valid profile', () => {
      const profile = {
        email: 'user@example.com',
        name: 'John Doe',
        location: { lat: 40.7128, lng: -74.006 },
      };
      const result = validateUserProfile(profile);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid email in profile', () => {
      const profile = {
        email: 'invalid',
        name: 'John Doe',
      };
      const result = validateUserProfile(profile);
      expect(result.isValid).toBe(false);
    });

    test('should validate name length', () => {
      const profile = {
        email: 'user@example.com',
        name: 'a'.repeat(101),
      };
      const result = validateUserProfile(profile);
      expect(result.isValid).toBe(false);
    });
  });
});
