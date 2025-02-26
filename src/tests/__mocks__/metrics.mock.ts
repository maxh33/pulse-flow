import { Counter, Gauge, Registry } from "prom-client";

const _mockMetrics = `
# HELP pulse_flow_tweets_total Total number of tweets
# TYPE pulse_flow_tweets_total counter
`;

export const register = {
  setDefaultLabels: jest.fn(),
  registerMetric: jest.fn(),
  contentType: "text/plain",
  metrics: jest.fn().mockResolvedValue("mocked metrics"),
  clear: jest.fn(),
  getMetricsAsJSON: jest.fn(),
  remove: jest.fn(),
} as unknown as Registry;

export const tweetCounter = {
  inc: jest.fn(),
};

export const sentimentCounter = {
  inc: jest.fn(),
};

export const platformCounter = {
  inc: jest.fn(),
};

export const engagementMetrics = {
  set: jest.fn(),
};

export const errorCounter = {
  inc: jest.fn(),
};

export const metrics = {
  tweetCounter,
  errorCounter,
  engagementMetrics,
  sentimentCounter,
  platformCounter,
};

// Mock Counter constructor
Counter.prototype.inc = jest.fn();
Counter.prototype.labels = jest.fn().mockReturnThis();

// Mock Gauge constructor
Gauge.prototype.set = jest.fn();
Gauge.prototype.labels = jest.fn().mockReturnThis();
