import mongoose, { Document } from "mongoose";
import { TweetData } from "../models/tweet";
import { Chance } from "chance";

const chance = new Chance();

export interface TweetDocument extends TweetData, Document {}

// Move the model declaration to a separate file to prevent overwrite
export const createTweetData = (): TweetData => {
  const likes = chance.integer({ min: 0, max: 1000 });
  const retweets = chance.integer({ min: 0, max: 100 });
  const comments = chance.integer({ min: 0, max: 500 });

  const total = likes + retweets + comments;
  const engagement_rate = parseFloat(((total / likes) * 100).toFixed(2));

  return {
    tweetId: new mongoose.Types.ObjectId().toHexString(),
    user: chance.twitter(),
    content: chance.sentence(),
    timestamp: new Date(),
    metrics: {
      retweets,
      likes,
      comments,
      total,
      engagement_rate,
    },
    sentiment: chance.pickone(["positive", "neutral", "negative"]),
    location: {
      country: chance.country({ full: true }),
      city: chance.city(),
    },
    platform: chance.pickone(["web", "android", "ios"]),
    tags: chance.pickset(
      ["tag1", "tag2", "tag3"],
      chance.integer({ min: 0, max: 3 }),
    ),
  };
};
