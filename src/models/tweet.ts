import mongoose from 'mongoose';

export interface TweetData {
  tweetId: string;
  user: string;
  content: string;
  timestamp: Date;
  metrics: {
    retweets: number;
    likes: number;
    comments: number;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  location: {
    country: string;
    city: string;
  };
  platform: 'web' | 'android' | 'ios';
  tags: string[];
}

const tweetSchema = new mongoose.Schema<TweetData>({
  tweetId: { type: String, required: true, unique: true },
  user: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metrics: {
    retweets: { type: Number, required: true },
    likes: { type: Number, required: true },
    comments: { type: Number, required: true }
  }
});

export const TweetModel = mongoose.model<TweetData>('Tweet', tweetSchema);