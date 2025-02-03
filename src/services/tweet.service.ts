import { TweetData, TweetModel } from '../models/tweet';
import * as metrics from '../monitoring/metrics';

export class TweetService {
  async createTweet(tweetData: TweetData) {
    try {
      // Store in MongoDB
      const tweet = await TweetModel.create(tweetData);
      
      // Track tweet creation
      metrics.tweetCounter.inc({ status: 'created' });
      
      // Track engagement metrics
      metrics.engagementGauge.set({ type: 'likes' }, tweet.metrics.likes);
      metrics.engagementGauge.set({ type: 'retweets' }, tweet.metrics.retweets);
      metrics.engagementGauge.set({ type: 'comments' }, tweet.metrics.comments);

      console.log('Tweet created:', tweet.tweetId);
      return tweet;
    } catch (error) {
      metrics.errorCounter.inc({ type: 'tweet_creation' });
      throw error;
    }
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
        metrics.errorCounter.inc({ type: 'batch_tweet_creation' });
      }
    }
    return results;
  }
}