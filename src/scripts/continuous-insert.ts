import { connectDB } from '../config/mongodb.config';
import { faker } from '@faker-js/faker';
import { TweetService } from '../services/tweet.service';
import createTweetData from '../factories/tweet.factory';
import * as metrics from '../monitoring/metrics';

async function continuousInsert() {
  const tweetService = new TweetService();
  let insertCount = 0;
  
  // Simulate different load patterns
  function getInsertDelay() {
    const hour = new Date().getHours();
    
    // Simulate peak hours (more frequent inserts)
    if (hour >= 9 && hour <= 17) {
      return faker.number.int({ min: 1000, max: 3000 }); // 1-3 seconds during business hours
    }
    
    // Off-peak hours (less frequent inserts)
    return faker.number.int({ min: 5000, max: 10000 }); // 5-10 seconds outside business hours
  }

  async function insertTweet() {
    try {
      const tweetData = new createTweetData();
      const tweet = await tweetService.createTweet(tweetData);
      insertCount++;
      
      // Log progress with useful information
      console.log({
        timestamp: new Date().toISOString(),
        insertCount,
        tweetId: tweet.tweetId,
        user: tweet.user,
        sentiment: tweet.sentiment,
        engagement: tweet.metrics,
        nextInsertDelay: getInsertDelay()
      });

      // Schedule next insert with dynamic delay
      setTimeout(insertTweet, getInsertDelay());
    } catch (error) {
      console.error('Insert failed:', error);
      metrics.errorCounter.inc({ type: 'continuous_insert' });
      // Retry after 5 seconds on error
      setTimeout(insertTweet, 5000);
    }
  }

  // Start insertion process
  insertTweet();

  // Cleanup on shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await tweetService.disconnect();
    process.exit(0);
  });

  // Handle other shutdown signals
  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Gracefully shutting down...');
    await tweetService.disconnect();
    process.exit(0);
  });
}

// Start the process
connectDB()
  .then(continuousInsert)
  .catch((error) => {
    console.error('Failed to start continuous insert:', error);
    process.exit(1);
  });