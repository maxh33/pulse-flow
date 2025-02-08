import client, { Counter, Registry, Gauge } from 'prom-client';
import { Express } from 'express';
import axios from 'axios';
import * as metrics from '../config/metrics.config';
import snappy from 'snappy';
import * as protobuf from 'protobufjs';
import { createTweetData } from '../factories/tweet.factory';
import { registry } from '../config/metrics.config';

// Create registry
export const register = new client.Registry();

// Initialize metrics with default labels
register.setDefaultLabels(metrics.defaultLabels);

// Initialize default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: metrics.prefix 
});

// Export metrics
export const {
  tweetCounter,
  engagementMetrics,
  sentimentCounter,
  platformCounter
} = metrics.metrics;

export const errorCounter = new Counter({
  name: `${metrics.prefix}errors_total`,
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
export async function pushMetrics() {
  try {
    // Create Protobuf payload from metrics
    const metricsData = await registry.metrics();
    
    // Compress the metrics data
    const compressedPayload = await snappy.compress(Buffer.from(metricsData));

    // Prepare authentication
    const authConfig = {
      username: process.env.GRAFANA_USERNAME!,
      password: process.env.GRAFANA_API_KEY!
    };

    // Push to Grafana Cloud with comprehensive error handling
    await axios.post(metrics.pushUrl!, compressedPayload, {
      auth: authConfig,
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'snappy',
        'X-Prometheus-Remote-Write-Version': '0.1.0',
        'Authorization': `Bearer ${process.env.GRAFANA_API_KEY}`
      },
      validateStatus: (status) => status === 200 || status === 204
    });

    console.log('Metrics pushed successfully');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Metrics push failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Unexpected metrics push error:', error);
    }
    
    // Optionally increment an error metric
    errorCounter.inc({ type: 'metrics_push_failure' });
    
    // Re-throw to allow caller to handle
    throw error;
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