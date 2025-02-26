export const defaultLabels = {
  app: "pulse-flow-test",
};

export const prefix = "pulse_flow_test_";

export const metrics = {
  tweetCounter: {
    inc: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  },
  engagementMetrics: {
    set: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  },
  sentimentCounter: {
    inc: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  },
  platformCounter: {
    inc: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  },
};

export const registry = {
  setDefaultLabels: jest.fn(),
  contentType: "text/plain",
  metrics: jest.fn(),
};
