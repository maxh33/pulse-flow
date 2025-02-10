import mongoose from 'mongoose';
import { TweetData, TweetModel } from '../models/tweet';
import * as metrics from '../monitoring/metrics';
import { Counter } from 'prom-client';

// Update the tweetCounter definition in metrics.config.ts
export const tweetCounter = new Counter({
  name: 'pulse_flow_tweets_total',
  help: 'Total number of tweets',
  labelNames: ['status', 'platform', 'sentiment'], // Add all required labels
  registers: [metrics.register]
});

export class TweetService {
  async createTweet(tweetData: TweetData) {
    try {
      // Store in MongoDB
      const tweet = await TweetModel.create(tweetData);
      
      // Track tweet creation
      tweetCounter.inc({
        status: 'created',
        platform: tweet.platform,
        sentiment: tweet.sentiment
      });
      
      // Track engagement metrics
      metrics.engagementMetrics.set(
        { type: 'likes', platform: tweet.platform, sentiment: tweet.sentiment }, 
        tweet.metrics.likes
      );
      metrics.engagementMetrics.set(
        { type: 'retweets', platform: tweet.platform, sentiment: tweet.sentiment }, 
        tweet.metrics.retweets
      );
      metrics.engagementMetrics.set(
        { type: 'comments', platform: tweet.platform, sentiment: tweet.sentiment }, 
        tweet.metrics.comments
      );

      // Track sentiment and platform
      metrics.sentimentCounter.inc({ sentiment: tweet.sentiment });
      metrics.platformCounter.inc({ platform: tweet.platform });

      console.log('Tweet created:', tweet.tweetId);
      return tweet;
    } catch (error) {
      console.error('Error processing tweet:', error);
      throw error;
    }
  }
  async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }

  // Method for bulk operations via Jenkins

  async createBatchTweets(tweets: TweetData[]) {
    const results = [];
    for (const tweet of tweets) {
      try {
        const result = await this.createTweet(tweet);
        results.push(result);
      } catch (error) {
        console.error('Failed to create tweet:', error);
        tweetCounter.inc({ status: 'failed' });
      }
    }
    return results;
  }
}