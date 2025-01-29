import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { TweetService } from '../services/tweet.service';
import { createTweetData } from '../factories/tweet.factory';
import { connectDB } from '../config/mongodb.config';

async function insertSampleTweets() {
  // Connect to MongoDB
  await connectDB();

  const tweetService = new TweetService();

  for (let i = 0; i < 10; i++) {
    const tweetData = createTweetData();
    await tweetService.createTweet(tweetData);
    console.log('Inserted sample tweet:', tweetData);
  }
}

insertSampleTweets().catch((error) => {
  console.error('Error inserting sample tweets:', error);
  process.exit(1);
});