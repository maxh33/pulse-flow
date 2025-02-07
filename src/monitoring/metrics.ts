import client, { Counter, Registry, Gauge } from 'prom-client';
import { Express } from 'express';
import axios from 'axios';
import snappy from 'snappy';
import { metricsConfig } from '../config/metrics.config';

// Create registry
export const register = new client.Registry();

// Initialize metrics with default labels
register.setDefaultLabels(metricsConfig.defaultLabels);

// Initialize default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: metricsConfig.prefix 
});

// Export metrics
export const tweetCounter = new Counter({
  name: `${metricsConfig.prefix}tweets_total`,
  help: 'Total number of tweets processed',
  registers: [register]
});

export const errorCounter = new Counter({
  name: `${metricsConfig.prefix}errors_total`,
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register]
});

export const engagementGauge = new Gauge({
  name: 'tweet_engagement',
  help: 'Current engagement metrics',
  labelNames: ['type'],
  registers: [register]
});

// Push metrics to Grafana Cloud
export async function pushMetrics(): Promise<void> {
  try {
    const metrics = await register.metrics();
    const compressed = await snappy.compress(Buffer.from(metrics));

    const auth = Buffer.from(`${process.env.GRAFANA_USERNAME}:${process.env.GRAFANA_API_KEY}`).toString('base64');

    await axios.post(metricsConfig.pushUrl!, compressed, {
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'snappy',
        'X-Prometheus-Remote-Write-Version': '0.1.0',
        'Authorization': `Basic ${auth}`
      },
      timeout: 30000
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Metrics push failed:', {
        status: error.response?.status,
        data: error.response?.data,
        url: metricsConfig.pushUrl,
        headers: error.response?.config?.headers
      });
    } else {
      console.error('Metrics push failed:', error);
    }
    errorCounter.inc({ type: 'metrics_push' });
  }
}

// Setup metrics endpoint
export const setupMetrics = (app: Express): void => {
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end(error instanceof Error ? error.message : 'Unknown error');
    }
  });
};