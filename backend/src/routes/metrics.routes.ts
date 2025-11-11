import { Router, Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

const router = Router();

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'm3u_streaming_',
});

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'm3u_streaming_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const httpRequestTotal = new promClient.Counter({
  name: 'm3u_streaming_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const playlistsTotal = new promClient.Gauge({
  name: 'm3u_streaming_playlists_total',
  help: 'Total number of playlists',
  registers: [register],
});

const channelsTotal = new promClient.Gauge({
  name: 'm3u_streaming_channels_total',
  help: 'Total number of channels',
  registers: [register],
});

const activeUsers = new promClient.Gauge({
  name: 'm3u_streaming_active_users',
  help: 'Number of active users',
  registers: [register],
});

// Middleware to collect metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
};

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to collect metrics',
    });
  }
});

// Export metrics for use in other modules
export { httpRequestDuration, httpRequestTotal, playlistsTotal, channelsTotal, activeUsers };

export default router;
