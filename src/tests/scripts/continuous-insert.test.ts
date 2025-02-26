import { continuousInsert } from "../../scripts/continuous-insert";
import { connectDB } from "../../config/mongodb.config";
import * as metrics from "../../monitoring/metrics";

// Mock dependencies
jest.mock("../../config/mongodb.config", () => ({
  connectDB: jest.fn(),
}));

jest.mock("../../monitoring/metrics", () => ({
  tweetCounter: { inc: jest.fn() },
  errorCounter: { inc: jest.fn() },
  engagementMetrics: { set: jest.fn() },
  sentimentCounter: { inc: jest.fn() },
  platformCounter: { inc: jest.fn() },
}));

// Mock tweet factory
jest.mock("../../factories/tweet.factory", () => ({
  createTweetData: jest.fn().mockReturnValue({
    tweetId: "123456",
    user: "testuser",
    content: "test content",
    timestamp: new Date(),
    metrics: {
      retweets: 5,
      likes: 10,
      comments: 3,
      total: 18,
      engagement_rate: 180,
    },
    sentiment: "positive",
    location: {
      country: "United States",
      city: "New York",
    },
    platform: "web",
    tags: ["tag1", "tag2"],
  }),
}));

// Mock TweetService to avoid actual MongoDB operations
jest.mock("../../services/tweet.service", () => {
  return {
    TweetService: jest.fn().mockImplementation(() => {
      return {
        createTweet: jest.fn().mockImplementation((tweetData) =>
          Promise.resolve({
            ...tweetData,
            _id: "mockId123",
          }),
        ),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe("Continuous Insert Script", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should run continuous insert with limited iterations", async () => {
    // Mock successful database connection
    (connectDB as jest.Mock).mockResolvedValue(true);

    // Run with limited iterations
    await continuousInsert({ maxIterations: 2 });

    // Verify metrics were incremented
    expect(metrics.tweetCounter.inc).toHaveBeenCalledTimes(2);
  }, 180000); // Increased timeout to 3 minutes

  it("should handle connection errors", async () => {
    // Mock connection failure
    (connectDB as jest.Mock).mockRejectedValue(new Error("Connection failed"));

    // Expect the error to be handled
    await expect(continuousInsert()).rejects.toThrow("Connection failed");

    // Verify error metrics were incremented
    expect(metrics.errorCounter.inc).toHaveBeenCalledWith({
      type: "continuous_insert_startup",
    });
  });
});
