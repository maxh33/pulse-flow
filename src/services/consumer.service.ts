import { TweetService } from './tweet.service';
import { errorCounter } from '../monitoring/metrics';

const tweetService = new TweetService();

export async function processBatchTweets(tweets: any[]): Promise<void> {
  try {
    await tweetService.createBatchTweets(tweets);
    console.log(`Processed ${tweets.length} tweets`);
  } catch (error) {
    console.error('Batch processing error:', error);
    errorCounter.inc({ type: 'batch_processing' });
    throw error;
  }
}