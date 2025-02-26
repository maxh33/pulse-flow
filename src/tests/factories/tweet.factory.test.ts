import { createTweetData } from "../../factories/tweet.factory";
import mongoose from "mongoose";

describe("Tweet Factory", () => {
  beforeAll(() => {
    // Mock mongoose.Types.ObjectId to return a predictable value
    jest.spyOn(mongoose.Types, "ObjectId").mockReturnValue({
      toHexString: () => "507f1f77bcf86cd799439011",
    } as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should create tweet data with all required fields", () => {
    const tweet = createTweetData();

    // Test presence and types of required fields
    expect(tweet).toHaveProperty("tweetId");
    expect(tweet).toHaveProperty("user");
    expect(tweet).toHaveProperty("content");
    expect(tweet).toHaveProperty("timestamp");
    expect(tweet).toHaveProperty("metrics");
    expect(tweet).toHaveProperty("sentiment");
    expect(tweet).toHaveProperty("location");
    expect(tweet).toHaveProperty("platform");
    expect(tweet).toHaveProperty("tags");
  });

  it("should create tweet with valid metrics", () => {
    const tweet = createTweetData();

    expect(tweet.metrics).toEqual(
      expect.objectContaining({
        retweets: expect.any(Number),
        likes: expect.any(Number),
        comments: expect.any(Number),
        total: expect.any(Number),
        engagement_rate: expect.any(Number),
      }),
    );

    // Verify metrics calculations
    const { retweets, likes, comments, total, engagement_rate } = tweet.metrics;
    expect(total).toBe(retweets + likes + comments);
    expect(engagement_rate).toBe(
      parseFloat(((total / likes) * 100).toFixed(2)),
    );
  });

  it("should create tweet with valid sentiment", () => {
    const tweet = createTweetData();
    expect(["positive", "neutral", "negative"]).toContain(tweet.sentiment);
  });

  it("should create tweet with valid platform", () => {
    const tweet = createTweetData();
    expect(["web", "android", "ios"]).toContain(tweet.platform);
  });

  it("should create tweet with valid location", () => {
    const tweet = createTweetData();

    expect(tweet.location).toEqual(
      expect.objectContaining({
        country: expect.any(String),
        city: expect.any(String),
      }),
    );
    expect(tweet.location.country.length).toBeGreaterThan(0);
    expect(tweet.location.city.length).toBeGreaterThan(0);
  });

  it("should create tweet with valid tags array", () => {
    const tweet = createTweetData();

    expect(Array.isArray(tweet.tags)).toBe(true);
    expect(tweet.tags.length).toBeLessThanOrEqual(3);
    tweet.tags.forEach((tag) => {
      expect(["tag1", "tag2", "tag3"]).toContain(tag);
    });
  });
});
