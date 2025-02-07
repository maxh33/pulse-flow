import client, { Counter } from 'prom-client';

const registry = new client.Registry();

// Add default labels that will be added to all metrics
registry.setDefaultLabels({
  app: 'pulse-flow',
  environment: process.env.NODE_ENV || 'development',
  instance: process.env.HOSTNAME || 'unknown'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({
  register: registry,
  prefix: 'pulse_flow_'
});

export { registry };

export const metrics = {
  tweetCounter: new client.Counter({
    name: 'pulse_flow_tweets_total',
    help: 'Total number of tweets',
    registers: [registry]
  }),
  errorCounter: new client.Counter({
    name: 'errors_total',
    help: 'Total number of errors'
  }),
  tweetProcessingTime: new client.Histogram({
    name: 'tweet_processing_duration_seconds',
    help: 'Time spent processing tweets',
    buckets: [0.1, 0.5, 1, 2, 5]
  })
};

export const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [registry],
});

export const metricsConfig = {
  pushUrl: process.env.GRAFANA_PUSH_URL,
  username: process.env.GRAFANA_USERNAME,
  apiKey: process.env.GRAFANA_API_KEY,
  prefix: 'pulse_flow_',
  pushInterval: parseInt(process.env.METRICS_PUSH_INTERVAL || '15000'),
  defaultLabels: {
    app: 'pulse-flow',
    environment: process.env.NODE_ENV || 'development'
  }
};