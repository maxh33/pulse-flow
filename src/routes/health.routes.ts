import { Router } from 'express';
import mongoose from 'mongoose';
import { healthConfig } from '../config/health.config';
import { tweetCounter, errorCounter } from '../monitoring/metrics';

const router = Router();

// Simple ping endpoint for basic health check
router.get('/ping', async (req, res) => {
  res.status(200).send('Ok');
});
    // Detailed health check endpoint
router.get('/healthz', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1;

    if (!dbStatus) {
      try {
        await mongoose.connect(process.env.MONGODB_URI!);
      } catch {
        errorCounter.inc({ type: 'mongodb_reconnect' });
        throw new Error('Database reconnection failed');
      }
    }

    // Get Metrics with timestamp
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      lastHeartbeat: new Date().toISOString(),
      dbStatus: dbStatus ? 'connected' : 'disconnected'
    };

    const statusCode = dbStatus ? 200 : 503;
    res.status(statusCode).json(metrics);

  } catch (error) {
    errorCounter.inc({ type: 'health_check' });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error : 'Service unavailable'
    });
  }
});

export { router as healthRoutes };