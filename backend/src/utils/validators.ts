/**
 * Input Validation Utilities
 * Ensures data integrity and prevents injection attacks
 * @module utils/validators
 */

/**
 * Validate email format
 * @param email Email to validate
 * @returns Is valid email
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Validation result with feedback
 */
export const validatePassword = (
  password: string
): { isValid: boolean; feedback: string[] } => {
  const feedback: string[] = [];

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    feedback.push('Password must contain special character (!@#$%^&*)');
  }

  return {
    isValid: feedback.length === 0,
    feedback,
  };
};

/**
 * Sanitize input to prevent XSS
 * @param input Input string
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 1000); // Max length
};

/**
 * Validate activity data
 * @param activity Activity object
 * @returns Validation result
 */
export const validateActivity = (activity: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!activity.type || !['transportation', 'energy', 'food', 'shopping', 'home'].includes(activity.type)) {
    errors.push('Invalid activity type');
  }

  if (!activity.category || typeof activity.category !== 'string') {
    errors.push('Category is required and must be string');
  }

  if (typeof activity.quantity !== 'number' || activity.quantity <= 0) {
    errors.push('Quantity must be positive number');
  }

  if (!activity.unit || typeof activity.unit !== 'string') {
    errors.push('Unit is required');
  }

  if (!activity.timestamp || isNaN(new Date(activity.timestamp).getTime())) {
    errors.push('Invalid timestamp');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate location data
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Is valid location
 */
export const validateLocation = (latitude: number, longitude: number): boolean => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Validate numeric range
 * @param value Value to validate
 * @param min Minimum allowed
 * @param max Maximum allowed
 * @returns Is valid
 */
export const validateNumericRange = (value: number, min: number, max: number): boolean => {
  return typeof value === 'number' && value >= min && value <= max;
};

/**
 * Validate date format
 * @param dateString Date string to validate
 * @returns Is valid ISO date
 */
export const validateDateFormat = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Validate user profile data
 * @param profile User profile
 * @returns Validation result
 */
export const validateUserProfile = (profile: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!profile.email || !validateEmail(profile.email)) {
    errors.push('Invalid email address');
  }

  if (profile.name && (typeof profile.name !== 'string' || profile.name.length === 0 || profile.name.length > 100)) {
    errors.push('Name must be string between 1-100 characters');
  }

  if (profile.location && !validateLocation(profile.location.lat, profile.location.lng)) {
    errors.push('Invalid location coordinates');
  }

  if (profile.preferredUnit && !['kg', 'lbs', 'metric', 'imperial'].includes(profile.preferredUnit)) {
    errors.push('Invalid preferred unit');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate pagination params
 * @param page Page number
 * @param limit Items per page
 * @returns Normalized params
 */
export const validatePagination = (
  page: any,
  limit: any
): { page: number; limit: number } => {
  let validPage = parseInt(page) || 1;
  let validLimit = parseInt(limit) || 10;

  validPage = Math.max(1, validPage);
  validLimit = Math.min(Math.max(1, validLimit), 100); // Max 100 per page

  return { page: validPage, limit: validLimit };
};

/**
 * Validate report filter
 * @param filter Filter object
 * @returns Validation result
 */
export const validateReportFilter = (filter: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (filter.startDate && !validateDateFormat(filter.startDate)) {
    errors.push('Invalid start date format');
  }

  if (filter.endDate && !validateDateFormat(filter.endDate)) {
    errors.push('Invalid end date format');
  }

  if (filter.startDate && filter.endDate) {
    if (new Date(filter.startDate) > new Date(filter.endDate)) {
      errors.push('Start date cannot be after end date');
    }
  }

  if (filter.activityType && !['transportation', 'energy', 'food', 'shopping', 'home'].includes(filter.activityType)) {
    errors.push('Invalid activity type');
  }

  if (filter.sortBy && !['date', 'emission', 'category'].includes(filter.sortBy)) {
    errors.push('Invalid sort field');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize object recursively
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
};

export default {
  validateEmail,
  validatePassword,
  sanitizeInput,
  validateActivity,
  validateLocation,
  validateNumericRange,
  validateDateFormat,
  validateUserProfile,
  validatePagination,
  validateReportFilter,
  sanitizeObject,
};
