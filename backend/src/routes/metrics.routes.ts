import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// Metrics disabled - install prom-client to enable

// Middleware to collect metrics (disabled)
export const metricsMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  // Metrics disabled - install prom-client to enable
  next();
};

/**
 * GET /metrics
 * Prometheus metrics endpoint (disabled)
 */
router.get('/metrics', async (_req, res) => {
  res.status(501).json({
    success: false,
    error: 'Metrics disabled - install prom-client to enable',
  });
});

export default router;
