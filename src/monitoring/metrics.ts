import client, { Counter, Registry } from 'prom-client';
import { Express } from 'express';
import { grafanaConfig } from '../config/grafana.config';
import axios from 'axios';
import snappy from 'snappy';

// Create and export the registry
export const register: Registry = new client.Registry();

// Initialize default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: grafanaConfig.metrics.prefix
});

// Basic metrics setup
export const errorCounter = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register]
});

// Simplified compress function
const compress = (data: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    snappy.compress(data, (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Push metrics to Grafana Cloud
export async function pushMetrics(): Promise<void> {
  try {
    const metricsData = await register.metrics();
    const url = process.env.GRAFANA_PUSH_URL;
    const username = process.env.GRAFANA_USERNAME;
    const token = process.env.GRAFANA_API_TOKEN;

    if (!url || !username || !token) {
      throw new Error('Missing Grafana configuration');
    }

    const compressedData = await compress(Buffer.from(metricsData));

    await axios.post(url, compressedData, {
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'snappy',
        'X-Prometheus-Remote-Write-Version': '0.1.0'
      },
      auth: { username, password: token }
    });

  } catch (error) {
    console.error('Metrics push failed:', error);
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