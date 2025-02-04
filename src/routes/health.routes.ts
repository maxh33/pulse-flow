import { Router } from 'express';
import mongoose from 'mongoose';
import { healthConfig } from '../config/health.config';
import { tweetCounter, errorCounter } from '../monitoring/metrics';

const router = Router();

router.get('/healthz', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1;

    // Get Metrics
    const metrics = {
      ordersProcessed: await tweetCounter.get(),
      errors: await errorCounter.get()
    };

    // Memory Usage
    const memoryUsage = process.memoryUsage();

    const response = {
      ...healthConfig.response,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
        api: 'healthy'
      },
      metrics,
      system: {
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
        },
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    const statusCode = dbStatus ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    errorCounter.inc({ type: 'health_check' });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Service unavailable',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

router.get('/ping', (_req, res) => {
  res.status(200).send('pong');
});

export { router as healthRoutes };