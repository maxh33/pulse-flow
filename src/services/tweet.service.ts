import { kafka } from '../config/kafka.config'; 
import { TweetData, TweetModel } from '../models/tweet';
import * as metrics from '../monitoring/metrics';

export class TweetService {
  static createTweet(_tweetData: TweetData) {
    throw new Error('Method not implemented.');
  }
  static disconnect() {
    throw new Error('Method not implemented.');
  }
  private producer = kafka.producer();
  private isConnected = false;

  private async ensureConnection() {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
    }
  }

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

      try {
        // Publish to Kafka
        await this.ensureConnection();
        await this.producer.send({
          topic: 'tweets',
          messages: [{ value: JSON.stringify(tweet) }]
        });
        
        // Track successful Kafka publish
        metrics.kafkaPublishCounter.inc({ topic: 'tweets' });
        console.log('Tweet published to Kafka:', tweet.tweetId);
      } catch (kafkaError) {
        console.error('Kafka publish error:', kafkaError);
        metrics.errorCounter.inc({ type: 'kafka_publish' });
        // Don't throw here - we still created the tweet successfully
      }

      return tweet;
    } catch (error) {
      metrics.errorCounter.inc({ type: 'tweet_creation' });
      throw error;
    }
  }

  // Cleanup method for graceful shutdown
  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }
}