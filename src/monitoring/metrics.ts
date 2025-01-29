import client, { Counter, Registry } from 'prom-client';
import { Express } from 'express';
import { grafanaConfig } from '../config/grafana.config';

// Setup Grafana metrics
const metrics = new Registry();
metrics.setDefaultLabels(grafanaConfig.metrics.defaultLabels);

// Initialize default metrics
client.collectDefaultMetrics({ 
  register: metrics,
  prefix: grafanaConfig.metrics.prefix,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

export const orderCounter = new Counter({
  name: `${grafanaConfig.metrics.prefix}orders_processed_total`,
  help: 'Total number of processed orders',
  labelNames: ['status'],
  registers: [metrics]
});

export const errorCounter = new Counter({
  name: `${grafanaConfig.metrics.prefix}errors_total`,
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [metrics]
});

// Request timeout and error handling
export const setupMetrics = (app: Express) => {
  app.get(grafanaConfig.metrics.path, async (req, res) => {
    try {
      res.set('Content-Type', metrics.contentType);
      const metricsData = await metrics.metrics();
      res.send(metricsData);
    } catch (error) {
      errorCounter.inc({ type: 'metrics_collection' });
      res.status(500).send('Error collecting metrics');
    }
  });
};


export { metrics };
