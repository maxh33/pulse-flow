import mongoose, { Schema, Document } from 'mongoose';
import { TweetData } from '../models/tweet';

export interface TweetDocument extends TweetData, Document {}

const TweetSchema: Schema = new Schema<TweetDocument>({
  tweetId: { type: String, required: true },
  user: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metrics: {
    retweets: { type: Number, required: true },
    likes: { type: Number, required: true },
    comments: { type: Number, required: true }
  },
  sentiment: { 
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true 
  },
  location: {
    country: { type: String, required: true },
    city: { type: String, required: true }
  },
  platform: { 
    type: String,
    enum: ['web', 'android', 'ios'],
    required: true 
  },
  tags: { type: [String], default: [] }
});

const TweetModel = mongoose.model<TweetDocument>('Tweet', TweetSchema);

export const createTweetData = (): TweetData => ({
  tweetId: new mongoose.Types.ObjectId().toHexString(),
  user: `User${Math.floor(Math.random() * 1000)}`,
  content: `This is a sample tweet content ${Math.floor(Math.random() * 1000)}`,
  timestamp: new Date(),
  metrics: {
    retweets: Math.floor(Math.random() * 100),
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 500)
  },
  sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as 'positive' | 'neutral' | 'negative',
  location: {
    country: 'Country' + Math.floor(Math.random() * 100),
    city: 'City' + Math.floor(Math.random() * 100)
  },
  platform: ['web', 'android', 'ios'][Math.floor(Math.random() * 3)] as 'web' | 'android' | 'ios',
  tags: ['tag1', 'tag2', 'tag3'].filter(() => Math.random() > 0.5)
});

export default TweetModel;
