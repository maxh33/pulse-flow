import mongoose, { Schema, Document } from 'mongoose';
import { TweetData } from '../models/tweet';
import { faker } from '@faker-js/faker';

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
  user: faker.internet.userName(),
  content: faker.lorem.sentence(),
  timestamp: new Date(),
  metrics: {
    retweets: faker.number.int({ min: 0, max: 100 }),
    likes: faker.number.int({ min: 0, max: 1000 }),
    comments: faker.number.int({ min: 0, max: 500 })
  },
  sentiment: faker.helpers.arrayElement(['positive', 'neutral', 'negative']),
  location: {
    country: faker.address.country(),
    city: faker.address.city()
  },
  platform: faker.helpers.arrayElement(['web', 'android', 'ios']),
  tags: faker.helpers.arrayElements(['tag1', 'tag2', 'tag3'], faker.number.int({ min: 0, max: 3 }))
});

export default TweetModel;