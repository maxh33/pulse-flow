import mongoose, { Schema, Document } from 'mongoose';
import { TweetData } from '../models/tweet';
import Chance from 'chance';

const chance = new Chance();

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
  user: chance.twitter(),
  content: chance.sentence(),
  timestamp: new Date(),
  metrics: {
    retweets: chance.integer({ min: 0, max: 100 }),
    likes: chance.integer({ min: 0, max: 1000 }),
    comments: chance.integer({ min: 0, max: 500 })
  },
  sentiment: chance.pickone(['positive', 'neutral', 'negative']),
  location: {
    country: chance.country({ full: true }),
    city: chance.city()
  },
  platform: chance.pickone(['web', 'android', 'ios']),
  tags: chance.pickset(['tag1', 'tag2', 'tag3'], chance.integer({ min: 0, max: 3 }))
});

export default TweetModel;