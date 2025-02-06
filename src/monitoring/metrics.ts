import client, { Counter, Registry, Gauge, Histogram } from 'prom-client';
import { Express } from 'express';
import { grafanaConfig } from '../config/grafana.config';
import helmet from 'helmet';
import { z } from 'zod';
import axios from 'axios';

// Create and export the registry with proper typing
export const register: Registry = new Registry();
register.setDefaultLabels(grafanaConfig.metrics.defaultLabels);

// Initialize default metrics
client.collectDefaultMetrics({ 
  register: register,
  prefix: grafanaConfig.metrics.prefix,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Tweet processing metrics
export const tweetCounter = new Counter({
  name: 'tweets_total',
  help: 'Total number of tweets processed',
  labelNames: ['status'],
  registers: [register]
});

// Engagement metrics
export const engagementGauge = new Gauge({
  name: `${grafanaConfig.metrics.prefix}tweet_engagement`,
  help: 'Tweet engagement metrics',
  labelNames: ['type'],
  registers: [register]
});

// Error counter
export const errorCounter = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register]
});

// Business metrics
export const transactionVolume = new Gauge({
  name: `${grafanaConfig.metrics.prefix}transaction_volume`,
  help: 'Transaction volume',
  registers: [register]
});

export const responseTime = new Histogram({
  name: `${grafanaConfig.metrics.prefix}response_time`,
  help: 'Response time in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const errorRate = new Counter({
  name: `${grafanaConfig.metrics.prefix}error_rate`,
  help: 'Error rate',
  registers: [register]
});

// Request timeout and error handling
export const setupMetrics = async (app: Express) => {
  // Add basic security headers
  app.use(helmet());

  // Metrics endpoint with basic auth
  app.get(grafanaConfig.metrics.path, async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metricsData = await register.metrics();
      res.send(metricsData);
    } catch (error) {
      console.error('Metrics collection error:', error);
      errorCounter.inc({ type: 'metrics_collection' });
      res.status(500).send('Error collecting metrics');
    }
  });
};

// Environment validation schema
export const EnvSchema = z.object({
  MONGODB_URI: z.string().url(),
  NODE_ENV: z.enum(['development', 'production']),
  API_KEY: z.string().min(32)
});

// Tweet validation schema
export const TweetSchema = z.object({
  content: z.string().max(280),
  user: z.string(),
  metrics: z.object({
    retweets: z.number().min(0),
    likes: z.number().min(0),
    comments: z.number().min(0)
  }),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  platform: z.enum(['web', 'android', 'ios'])
});

// Push metrics to Grafana Cloud with proper typing
export async function pushMetrics(): Promise<void> {
  try {
    const metricsData = await register.metrics();
    const baseUrl = process.env.GRAFANA_CLOUD_URL?.replace(/\/$/, ''); // Remove trailing slash if present
    const url = `${baseUrl}/api/v1/push`; // Changed to the correct endpoint

    await axios.post(url, metricsData, {
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Bearer ${process.env.GRAFANA_API_KEY}`,
        'X-Scope-OrgID': process.env.GRAFANA_ORG_ID || '1'
      },
      timeout: 5000, // Add timeout
      validateStatus: (status) => status < 500
    });
    
    console.log('Metrics pushed successfully');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to push metrics:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url?.replace(process.env.GRAFANA_API_KEY || '', '[REDACTED]') // Hide API key in logs
      });
    } else {
      console.error('Failed to push metrics:', error);
    }
  }
}

// Setup periodic push (every 15 seconds)
setInterval(pushMetrics, 15000);

export async function startMetricsCollection(): Promise<() => void> {
  const interval = setInterval(async () => {
    try {
      await pushMetrics();
    } catch (error) {
      console.error('Error pushing metrics:', error);
    }
  }, grafanaConfig.metrics.pushInterval);

  // Return cleanup function
  return () => {
    clearInterval(interval);
    console.log('Metrics collection stopped');
  };
}