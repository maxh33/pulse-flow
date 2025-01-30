// Insert sample tweets
db.tweets.insertMany([
  {
    tweetId: "TWEET001",
    user: "User1",
    content: "This is a sample tweet content 1",
    timestamp: new Date(),
    metrics: {
      retweets: 10,
      likes: 100,
      comments: 5
    }
  },
  {
    tweetId: "TWEET002",
    user: "User2",
    content: "This is a sample tweet content 2",
    timestamp: new Date(),
    metrics: {
      retweets: 20,
      likes: 200,
      comments: 10
    }
  }
]);

// Test Queries
// Find all tweets
db.tweets.find();

// Count by user
db.tweets.aggregate([
  { $group: { _id: "$user", count: { $sum: 1 } } }
]);

// Calculate total interactions (retweets + likes + comments)
db.tweets.aggregate([
  {
    $addFields: {
      totalInteractions: {
        $sum: ["$metrics.retweets", "$metrics.likes", "$metrics.comments"]
      }
    }
  }
]);