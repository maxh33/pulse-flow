import { kafka } from '../config/kafka.config'; 
import { TweetData, TweetModel } from '../models/tweet';
import * as metrics from '../monitoring/metrics';

export class TweetService {
  async createTweet(tweetData: TweetData) {
    try {
      // Store in MongoDB
      const tweet = await TweetModel.create(tweetData);
      
      // Publish to Kafka
      const producer = kafka.producer();
      await producer.connect();
      await producer.send({
        topic: 'tweets',
        messages: [{ value: JSON.stringify(tweet) }]
      });
      await producer.disconnect();
      console.log('Tweet published to Kafka:', tweet);
      
      // Track metric
      metrics.orderCounter.inc();

      return tweet;
    } catch (error) {
      metrics.errorCounter.inc();
      throw error;
    }
  }
}