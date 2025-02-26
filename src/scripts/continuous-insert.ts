import { connectDB } from "../config/mongodb.config";
import { Chance } from "chance";
import { TweetService } from "../services/tweet.service";
import { createTweetData } from "../factories/tweet.factory";
import * as metrics from "../monitoring/metrics";

const chance = new Chance();
const tweetService = new TweetService();

export const continuousInsert = async (options?: {
  maxIterations?: number;
}) => {
  const maxIterations = options?.maxIterations ?? Infinity;
  let iterationCount = 0;

  try {
    await connectDB();
    console.log("Connected to MongoDB - Starting continuous insert...");

    const handleShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Gracefully shutting down...`);
      await tweetService.disconnect();
      process.exit(0);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    while (iterationCount < maxIterations) {
      try {
        const tweetData = createTweetData();
        const tweet = await tweetService.createTweet(tweetData);

        // Safety check for properties before accessing them (helps with tests)
        const platform = tweet?.platform || "unknown";
        const sentiment = tweet?.sentiment || "neutral";

        metrics.tweetCounter.inc({
          status: "created",
          platform: platform,
          sentiment: sentiment,
        });
        iterationCount++;

        // Safely log tweet data with null checks
        console.log({
          timestamp: new Date().toISOString(),
          insertCount: iterationCount,
          tweetId: tweet?.tweetId || "unknown",
          user: tweet?.user || "unknown",
          sentiment: tweet?.sentiment || "unknown",
          engagement: tweet?.metrics || { likes: 0, retweets: 0, comments: 0 },
        });

        // Dynamic delay based on hour
        const currentHour = new Date().getHours();
        const delay =
          currentHour >= 9 && currentHour <= 17
            ? chance.integer({ min: 1000, max: 3000 }) // Business hours
            : chance.integer({ min: 5000, max: 10000 }); // Off hours

        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        console.error("Insert failed:", error);
        metrics.errorCounter.inc({ type: "continuous_insert" });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error("Failed to start continuous insert:", error);
    metrics.errorCounter.inc({ type: "continuous_insert_startup" });
    throw error;
  }
};
