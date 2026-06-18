/**
 * Authentication Middleware
 * Handles JWT validation and OAuth 2.0 verification
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { oauth2Client } from '../config/googleServices';

/**
 * Extended Express Request with user data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    googleId?: string;
    role?: string;
  };
  token?: string;
}

/**
 * Verify JWT token
 * @param req Express request
 * @param res Express response
 * @param next Next middleware
 */
export const verifyJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET environment variable is not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    req.user = {
      id: decoded.id as string,
      email: decoded.email as string,
      googleId: decoded.googleId as string,
      role: (decoded.role as string) || 'user',
    };
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Verify Google OAuth token
 * @param req Express request
 * @param res Express response
 * @param next Next middleware
 */
export const verifyGoogleToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No Google token provided' });
      return;
    }

    const token = authHeader.slice(7);
    oauth2Client.setCredentials({ access_token: token });

    // Verify token by making a simple API call
    const oauth2 = google.oauth2('v2');
    const userInfo = await oauth2.userinfo.get({ auth: oauth2Client });

    req.user = {
      id: userInfo.data.id,
      email: userInfo.data.email,
      googleId: userInfo.data.id,
    };
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid Google token' });
  }
};

/**
 * Check user role (RBAC)
 * @param allowedRoles Allowed roles
 * @returns Middleware function
 */
export const checkRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role || 'user')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * CORS security headers
 * @param req Express request
 * @param res Express response
 * @param next Next middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // CSP header
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"
  );

  // CORS
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  next();
};

/**
 * Rate limiting middleware
 * @param maxRequests Maximum requests allowed
 * @param windowMs Time window in milliseconds
 * @returns Middleware function
 */
export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    const timestamps = requests.get(identifier) || [];

    // Remove old requests outside the window
    const recentRequests = timestamps.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(((recentRequests[0] ?? now) + windowMs - now) / 1000),
      });
      return;
    }

    recentRequests.push(now);
    requests.set(identifier, recentRequests);

    next();
  };
};

/**
 * Request logging middleware
 * @param req Express request
 * @param res Express response
 * @param next Next middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.info(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

/**
 * Error handling middleware
 * @param error Error object
 * @param req Express request
 * @param res Express response
 * @param next Next middleware
 */
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  if (error.statusCode) {
    res.status(error.statusCode).json({ error: error.message });
  } else if (error.name === 'ValidationError') {
    res.status(400).json({ error: 'Invalid request data' });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  verifyJWT,
  verifyGoogleToken,
  checkRole,
  securityHeaders,
  rateLimit,
  requestLogger,
  errorHandler,
};
