import { Router } from 'express';
import mongoose from 'mongoose';
import { healthConfig } from '../config/health.config';

const router = Router();

router.get(healthConfig.path, async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1;

    res.status(healthConfig.statusCode).json({
      ...healthConfig.response,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
        api: 'healthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Service unavailable'
    });
  }
});

export { router as healthRoutes };