import mongoose, { Schema, Document } from "mongoose";
import { TweetData } from "../types/tweet";

export interface TweetDocument extends TweetData, Document {}

const TweetSchema: Schema = new Schema<TweetDocument>({
  tweetId: { type: String, required: true },
  user: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metrics: {
    retweets: { type: Number, required: true },
    likes: { type: Number, required: true },
    comments: { type: Number, required: true },
    total: { type: Number, required: true },
    engagement_rate: { type: Number, required: true },
  },
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "negative"],
    required: true,
  },
  location: {
    country: { type: String, required: true },
    city: { type: String, required: true },
  },
  platform: {
    type: String,
    enum: ["web", "android", "ios"],
    required: true,
  },
  tags: { type: [String], default: [] },
});

// Use mongoose.models to prevent model overwrite
export const TweetModel =
  mongoose.models.Tweet || mongoose.model<TweetDocument>("Tweet", TweetSchema);

export { TweetData };
