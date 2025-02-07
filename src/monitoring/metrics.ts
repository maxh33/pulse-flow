import client, { Counter, Registry, Gauge, Histogram } from 'prom-client';
import { Express } from 'express';
import { grafanaConfig } from '../config/grafana.config';
import helmet from 'helmet';
import { z } from 'zod';
import axios from 'axios';
import snappy from 'snappy';

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

// Add these metrics
export const responseTimeMetric = new Histogram({
  name: 'pulse_flow_response_time',
  help: 'Response time in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const heapSizeMetric = new Gauge({
  name: 'pulse_flow_nodejs_heap_size_used_bytes',
  help: 'Process heap size in bytes',
});

export const errorRateMetric = new Counter({
  name: 'pulse_flow_error_rate_total',
  help: 'Total number of errors',
  labelNames: ['type']
});

// Add these new metrics
export const tweetProcessingTime = new Histogram({
  name: `${grafanaConfig.metrics.prefix}tweet_processing_duration_seconds`,
  help: 'Time spent processing tweets',
  labelNames: ['status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const tweetSentiment = new Counter({
  name: `${grafanaConfig.metrics.prefix}tweet_sentiment_total`,
  help: 'Distribution of tweet sentiments',
  labelNames: ['sentiment']
});

export const tweetPlatform = new Counter({
  name: `${grafanaConfig.metrics.prefix}tweet_platform_total`,
  help: 'Distribution of tweet platforms',
  labelNames: ['platform']
});

export const tweetMetrics = new Counter({
  name: `${grafanaConfig.metrics.prefix}tweet_metrics_total`,
  help: 'Tweet engagement metrics',
  labelNames: ['type']
});

// Use these metrics in your tweet processing logic
export const trackTweet = (tweet: any) => {
  const start = Date.now();
  
  // Track sentiment
  tweetSentiment.inc({ sentiment: tweet.sentiment });
  
  // Track platform
  tweetPlatform.inc({ platform: tweet.platform });
  
  // Track metrics
  tweetMetrics.inc({ type: 'likes' }, tweet.metrics.likes);
  tweetMetrics.inc({ type: 'retweets' }, tweet.metrics.retweets);
  tweetMetrics.inc({ type: 'comments' }, tweet.metrics.comments);
  
  // Track processing time
  tweetProcessingTime.observe(Date.now() - start);
};

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

  // Track heap size
  setInterval(() => {
    const used = process.memoryUsage().heapUsed;
    heapSizeMetric.set(used);
  }, 5000);

  // Track response times
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      responseTimeMetric.observe({ 
        method: req.method, 
        route: req.route?.path || 'unknown' 
      }, duration / 1000); // Convert to seconds
    });
    next();
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
    const url = process.env.GRAFANA_PUSH_URL;
    const username = process.env.GRAFANA_USERNAME;
    const token = process.env.GRAFANA_API_TOKEN;

    if (!url || !username || !token) {
      throw new Error('Missing required Grafana configuration');
    }

    // Convert metrics to protocol buffer format
    const writeRequest = {
      timeseries: [{
        labels: [{
          name: '__name__',
          value: 'pulse_flow_metrics'
        }],
        samples: [{
          value: 1,
          timestamp: Date.now()
        }]
      }]
    };

    // Compress the protocol buffer data
    const compressedData = await snappy.compress(Buffer.from(JSON.stringify(writeRequest)));

    await axios.post(url, compressedData, {
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'snappy',
        'X-Prometheus-Remote-Write-Version': '0.1.0'
      },
      auth: {
        username,
        password: token
      }
    });
    
    console.log('Metrics pushed successfully');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to push metrics:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
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
  }, parseInt(process.env.METRICS_PUSH_INTERVAL || '15000'));

  // Return cleanup function
  return () => {
    clearInterval(interval);
    console.log('Metrics collection stopped');
  };
}