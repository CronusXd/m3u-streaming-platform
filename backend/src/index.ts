import express, { Application } from 'express';
import dotenv from 'dotenv';
import {
  securityHeaders,
  corsOptions,
  loggerMiddleware,
  errorHandler,
  notFoundHandler,
  apiLimiter,
} from './middleware';
import { metricsMiddleware } from './routes/metrics.routes';

// Import routes
import playlistsRouter from './routes/playlists.routes';
import channelsRouter from './routes/channels.routes';
import searchRouter from './routes/search.routes';
import favoritesRouter from './routes/favorites.routes';
import healthRouter from './routes/health.routes';
import metricsRouter from './routes/metrics.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security headers (helmet)
app.use(securityHeaders);

// CORS
app.use(corsOptions);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(loggerMiddleware);

// Metrics collection (optional)
if (process.env.ENABLE_METRICS === 'true') {
  app.use(metricsMiddleware);
}

// ============================================
// HEALTH CHECK ROUTES (no rate limiting)
// ============================================

app.use('/', healthRouter);

// ============================================
// METRICS ROUTES (no rate limiting)
// ============================================

if (process.env.ENABLE_METRICS === 'true') {
  app.use('/', metricsRouter);
}

// ============================================
// API ROUTES (with rate limiting)
// ============================================

app.use('/api', apiLimiter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/search', searchRouter);
app.use('/api/favorites', favoritesRouter);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   📺 PlayCoreTV API                                      ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Port: ${PORT}                                              ║
║   Health: http://localhost:${PORT}/healthz                   ║
║   Metrics: ${process.env.ENABLE_METRICS === 'true' ? `http://localhost:${PORT}/metrics` : 'disabled'}      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

export default app;
