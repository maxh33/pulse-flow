import client from "prom-client";

const registry = new client.Registry();

// Add default labels that will be added to all metrics
registry.setDefaultLabels({
  app: "pulse-flow",
  environment: process.env.NODE_ENV || "development",
  instance: process.env.HOSTNAME || "unknown",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({
  register: registry,
  prefix: "pulse_flow_",
});

export const metrics = {
  tweetCounter: new client.Counter({
    name: "pulse_flow_tweets_total",
    help: "Total number of tweets",
    labelNames: ["status", "platform", "sentiment"],
    registers: [registry],
  }),
  engagementMetrics: new client.Gauge({
    name: "pulse_flow_tweet_engagement",
    help: "Tweet engagement metrics",
    labelNames: ["type", "platform", "sentiment"],
    registers: [registry],
  }),
  sentimentCounter: new client.Counter({
    name: "pulse_flow_tweet_sentiment_total",
    help: "Total tweets by sentiment",
    labelNames: ["sentiment"],
    registers: [registry],
  }),
  platformCounter: new client.Counter({
    name: "pulse_flow_tweet_platform_total",
    help: "Total tweets by platform",
    labelNames: ["platform"],
    registers: [registry],
  }),
};

export { registry };

export const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "endpoint", "status"],
  registers: [registry],
});

export const defaultLabels = {
  app: "pulse_flow",
  environment: "production",
  instance: "pulse-flow-prod",
};

export const prefix = "pulse_flow_";

export const pushUrl = process.env.GRAFANA_PUSH_URL;

export const metricsConfig = {
  pushUrl,
  prefix,
  defaultLabels: {
    app: "pulse_flow",
    environment: "production",
    instance: "pulse-flow-prod",
  },
  pushInterval: parseInt(process.env.METRICS_PUSH_INTERVAL || "60000"),
  compression: {
    enabled: true,
    algorithm: "snappy",
  },
  retryConfig: {
    retries: 3,
    backoff: {
      initial: 5000,
      max: 30000,
      factor: 2,
    },
  },
};
