import { Router } from 'express';
import mongoose from 'mongoose';
import { healthConfig } from '../config/health.config';
import { Kafka } from 'kafkajs';
import { orderCounter, errorCounter } from '../monitoring/metrics';

const router = Router();

router.get(healthConfig.path, async (req, res) => {
  try {
    // MongoDB Status
    const dbStatus = mongoose.connection.readyState === 1;

    // Kafka Status Check
    let kafkaStatus = 'disconnected';
    try {
      const kafka = new Kafka({
        clientId: 'health-check',
        brokers: process.env.KAFKA_BROKERS?.split(',') || []
      });
      const admin = kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      kafkaStatus = 'connected';
    } catch (error) {
      console.error('Kafka health check failed:', error);
    }

    // Get Metrics
    const metrics = {
      ordersProcessed: await orderCounter.get(),
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
        kafka: kafkaStatus,
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

    // Set status code based on service health
    const isHealthy = dbStatus && kafkaStatus === 'connected';
    const statusCode = isHealthy ? healthConfig.statusCode : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    errorCounter.inc();
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Service unavailable',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
});

// Ping endpoint for basic availability checks
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

export { router as healthRoutes };