import client, { Counter, Gauge } from 'prom-client';
import { Express } from 'express';
import axios from 'axios';
import * as metrics from '../config/metrics.config';
import snappy from 'snappy';
import * as protobuf from 'protobufjs';
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

// Sanitize metric names to be Prometheus/Mimir compliant
function sanitizeMetricName(name: string): string {
  // Remove any non-alphanumeric characters except underscores
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^[^a-z_]/, '_');
}

function createProtobufPayload(metricsData: string) {
  // Sanitize and validate metric names
  const sanitizedMetricLines = metricsData
    .split('\n')
    .map(line => {
      const parts = line.split(' ');
      if (parts.length >= 2) {
        parts[0] = sanitizeMetricName(parts[0]);
        return parts.join(' ');
      }
      return line;
    })
    .filter(line => line.trim() && !line.startsWith('#'));

  // Create a simple Protobuf message structure
  const root = protobuf.Root.fromJSON({
    nested: {
      prometheus: {
        nested: {
          WriteRequest: {
            fields: {
              timeseries: {
                rule: 'repeated',
                type: 'TimeSeries',
                id: 1
              }
            }
          },
          TimeSeries: {
            fields: {
              labels: {
                rule: 'repeated',
                type: 'Label',
                id: 1
              },
              samples: {
                rule: 'repeated',
                type: 'Sample',
                id: 2
              }
            }
          },
          Label: {
            fields: {
              name: {
                type: 'string',
                id: 1
              },
              value: {
                type: 'string',
                id: 2
              }
            }
          },
          Sample: {
            fields: {
              value: {
                type: 'double',
                id: 1
              },
              timestamp: {
                type: 'int64',
                id: 2
              }
            }
          }
        }
      }
    }
  });

  const WriteRequest = root.lookupType('prometheus.WriteRequest');
  
  // Convert metrics to TimeSeries
  const timeseries = sanitizedMetricLines.map(line => {
    const [metricName, value, timestamp] = line.split(' ');
    
    return {
      labels: [
        { name: '__name__', value: metricName },
        { name: 'app', value: 'pulse_flow' },
        { name: 'environment', value: process.env.NODE_ENV || 'development' }
      ],
      samples: [{
        value: parseFloat(value),
        timestamp: parseInt(timestamp) || Date.now()
      }]
    };
  });

  // Create and verify the payload
  const payload = { timeseries };
  const errMsg = WriteRequest.verify(payload);
  if (errMsg) {
    console.error('Invalid payload:', errMsg);
    throw new Error('Invalid metrics payload');
  }

  return WriteRequest.encode(payload).finish();
}

// Add rate limiting
let lastPushTime = 0;
// Increase the minimum interval to better match Grafana's rate limits
// 75 requests/s = 1 request every ~13.33ms, let's be conservative
const _MIN_PUSH_INTERVAL = 60000; // Changed to 60 seconds (1 minute)
const MAX_REQUESTS_PER_MINUTE = 60; // Keep well under the 75/s limit
let requestsThisMinute = 0;

export async function pushMetrics() {
  try {
    const now = Date.now();
    
    // Reset counter each minute
    if (now - lastPushTime >= 60000) {
      requestsThisMinute = 0;
      lastPushTime = now;
    }

    // Check if we're within rate limits
    if (requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
      // Silent skip - don't log to avoid pollution
      return;
    }

    // Increment counter before pushing
    requestsThisMinute++;

    // Create Protobuf payload from metrics
    const metricsData = await registry.metrics();
    const protobufPayload = createProtobufPayload(metricsData);
    
    // Compress the metrics data
    const compressedPayload = await snappy.compress(Buffer.from(protobufPayload));

    await axios.post(metrics.pushUrl!, compressedPayload, {
      auth: {
        username: process.env.GRAFANA_USERNAME!,
        password: process.env.GRAFANA_API_KEY!
      },
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'snappy',
        'X-Prometheus-Remote-Write-Version': '0.1.0',
        'Authorization': `Bearer ${process.env.GRAFANA_API_KEY}`
      },
      validateStatus: (status) => status === 200 || status === 204
    });

    // Only log successful pushes (reduce log pollution)
    if (process.env.NODE_ENV === 'development') {
      console.log('Metrics pushed successfully');
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      // Silent handling of rate limit errors
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      lastPushTime = Date.now() + (retryAfter * 1000);
    } else {
      // Only log non-rate-limit errors
      console.error('Metrics push failed:', {
        status: axios.isAxiosError(error) ? error.response?.status : 'N/A',
        message: error instanceof Error ? error.message : String(error)
      });
      errorCounter.inc({ type: 'metrics_push_failure' });
    }
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