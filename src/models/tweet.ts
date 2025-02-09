import mongoose from 'mongoose';
import { Document, ObjectId } from 'mongodb';

export interface TweetData {
  tweetId: string;
  user: string;
  content: string;
  timestamp: Date;
  metrics: {
    retweets: number;
    likes: number;
    comments: number;
    total: number;
    engagement_rate: number;
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
    comments: { type: Number, required: true },
    total: { type: Number, required: true },
    engagement_rate: { type: Number, required: true }
  }
});

export const TweetModel = mongoose.model<TweetData>('Tweet', tweetSchema);

export interface TweetDocument extends Document {

tweetId: string;

user: string;

content: string;

timestamp: Date;

metrics: {

  retweets: number;

  likes: number;

  comments: number;

};

sentiment: string;

location: {

  country: string;

  city: string;

};

platform: string;

tags: string[];

_id: ObjectId;

__v: number;

$assertPopulated: () => void;

$clearModifiedPaths: () => void;

$createModifiedPathsSnapshot: () => void;

}
