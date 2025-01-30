import { TweetData } from '../models/tweet';
import { v4 as uuidv4 } from 'uuid';

export function createTweetData(): TweetData {
  return {
    tweetId: uuidv4(),
    user: `User${Math.floor(Math.random() * 1000)}`,
    content: `This is a sample tweet content ${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date(),
    metrics: {
      retweets: Math.floor(Math.random() * 100),
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100)
    }
  };
}