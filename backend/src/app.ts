/**
 * Main Express Application
 * Carbon Footprint Tracking Platform
 * @module app
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as dotenv from 'dotenv';

// Import middleware
import {
  securityHeaders,
  requestLogger,
  errorHandler,
  rateLimit,
} from './middleware/auth';

// Import routes (will be created)
// import authRoutes from './routes/auth';
// import activityRoutes from './routes/activities';
// import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

/**
 * Security Middleware
 */
app.use(helmet());
app.use(securityHeaders);
app.use(rateLimit(100, 60000)); // 100 requests per minute

/**
 * Body Parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * Compression
 */
app.use(compression());

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

/**
 * Logging
 */
app.use(requestLogger);

/**
 * Health Check Endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Version Endpoint
 */
app.get('/api/version', (req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    name: 'Carbon Footprint Platform',
    description: 'Track and reduce your carbon footprint with AI-powered insights',
  });
});

/**
 * Routes
 */
// app.use('/api/auth', authRoutes);
// app.use('/api/activities', activityRoutes);
// app.use('/api/dashboard', dashboardRoutes);

/**
 * Welcome Route
 */
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Carbon Footprint Platform API',
    endpoints: {
      health: '/health',
      version: '/api/version',
      auth: '/api/auth',
      activities: '/api/activities',
      dashboard: '/api/dashboard',
      recommendations: '/api/recommendations',
      google: '/api/google',
    },
  });
});

/**
 * Root redirect to API
 */
app.get('/', (req: Request, res: Response) => {
  res.redirect('/api');
});

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = (): void => {
  try {
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║  🌍 Carbon Footprint Platform API                         ║
║  Version: 1.0.0                                          ║
║  Status: Running                                          ║
║  Server: http://localhost:${PORT}                            ║
║  Environment: ${process.env.NODE_ENV || 'development'}                     ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

/**
 * Unhandled Promise Rejection Handler
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export { app, startServer };

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
