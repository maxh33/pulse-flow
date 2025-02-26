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
  sentiment: "positive" | "neutral" | "negative";
  location: {
    country: string;
    city: string;
  };
  platform: "web" | "android" | "ios";
  tags: string[];
}
