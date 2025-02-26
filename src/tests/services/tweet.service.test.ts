import { TweetService } from "../../services/tweet.service";
import { createTweetData } from "../../factories/tweet.factory";
import { TweetModel } from "../../models/tweet";
import mongoose from "mongoose";

// Mock both metrics and config
jest.mock("../../monitoring/metrics", () =>
  require("../__mocks__/metrics.mock"),
);
jest.mock("../../config/metrics.config", () =>
  require("../__mocks__/metrics.config.mock"),
);

const metrics = require("../../monitoring/metrics");

describe("TweetService", () => {
  let tweetService: TweetService;

  beforeAll(async () => {
    // Use in-memory MongoDB for testing
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/test",
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(() => {
    tweetService = new TweetService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await TweetModel.deleteMany({});
  });

  describe("createTweet", () => {
    it("should create a tweet and increment metrics", async () => {
      const tweetData = createTweetData();
      const result = await tweetService.createTweet(tweetData);

      // Verify tweet was created
      expect(result).toBeDefined();
      expect(result.tweetId).toBe(tweetData.tweetId);
      expect(result.content).toBe(tweetData.content);

      // Verify metrics were incremented
      expect(metrics.tweetCounter.inc).toHaveBeenCalledWith({
        status: "created",
        platform: tweetData.platform,
        sentiment: tweetData.sentiment,
      });

      expect(metrics.engagementMetrics.set).toHaveBeenCalledTimes(3); // likes, retweets, comments
      expect(metrics.sentimentCounter.inc).toHaveBeenCalledWith({
        sentiment: tweetData.sentiment,
      });
      expect(metrics.platformCounter.inc).toHaveBeenCalledWith({
        platform: tweetData.platform,
      });
    });

    it("should handle errors during tweet creation", async () => {
      const mockCreate = jest.spyOn(TweetModel, "create");
      mockCreate.mockRejectedValueOnce(new Error("Database error"));

      const tweetData = createTweetData();
      await expect(tweetService.createTweet(tweetData)).rejects.toThrow(
        "Database error",
      );

      expect(metrics.errorCounter.inc).toHaveBeenCalledWith({
        type: "tweet_creation",
      });

      mockCreate.mockRestore();
    });
  });

  describe("createBatchTweets", () => {
    it("should create multiple tweets", async () => {
      const tweetsData = [createTweetData(), createTweetData()];
      const results = await tweetService.createBatchTweets(tweetsData);

      expect(results).toHaveLength(2);
      expect(metrics.tweetCounter.inc).toHaveBeenCalledTimes(2);
    });

    it("should handle errors in batch creation", async () => {
      const tweetsData = [createTweetData(), createTweetData()];

      // Mock first tweet to succeed and second to fail
      jest
        .spyOn(TweetModel, "create")
        .mockResolvedValueOnce(tweetsData[0] as any)
        .mockRejectedValueOnce(new Error("Database error"));

      const results = await tweetService.createBatchTweets(tweetsData);

      expect(results).toHaveLength(1);
      expect(metrics.tweetCounter.inc).toHaveBeenCalledWith({
        status: "failed",
      });
    });
  });
});
