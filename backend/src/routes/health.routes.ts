import { Router } from 'express';
import { SupabaseService } from '../clients/supabase';

const router = Router();

/**
 * GET /healthz
 * Health check endpoint
 */
router.get('/healthz', async (req, res) => {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
    },
  };

  try {
    // Check Supabase connection
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (supabaseUrl && supabaseKey) {
      const supabase = new SupabaseService(supabaseUrl, supabaseKey);
      // Try to query playlists table
      await supabase.getPublicPlaylists();
      healthcheck.checks.database = 'healthy';
    } else {
      healthcheck.checks.database = 'not_configured';
    }

    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.status = 'unhealthy';
    healthcheck.checks.database = 'unhealthy';

    res.status(503).json({
      ...healthcheck,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /readyz
 * Readiness check endpoint
 */
router.get('/readyz', (req, res) => {
  // Check if application is ready to serve traffic
  const ready = {
    status: 'ready',
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(ready);
});

/**
 * GET /livez
 * Liveness check endpoint
 */
router.get('/livez', (req, res) => {
  // Simple liveness check
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
