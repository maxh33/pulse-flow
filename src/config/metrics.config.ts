import client, { Counter } from 'prom-client';


const registry = new client.Registry();
registry.setDefaultLabels({ app: 'pulse-flow' });

client.collectDefaultMetrics({ register: registry });

export const metrics = {
  tweetCounter: new client.Counter({
    name: 'tweets_total',
    help: 'Total number of tweets'
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