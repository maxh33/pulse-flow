import amqp, { Connection, Channel } from 'amqplib';
import { TweetData } from '../models/tweet';

export class MessageQueue {
  private connection!: Connection;
  private channel!: Channel;
  private readonly url: string;
  private lastMessageTime?: number;

  constructor(url: string) {
    this.url = url;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publishTweet(tweet: TweetData) {
    const queue = 'tweet_processing';
    
    // Implement rate limiting
    const maxMessagesPerSecond = 100; // based on free tier limit
    await this.rateLimiter(maxMessagesPerSecond);
    
    await this.channel.assertQueue(queue);
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(tweet)), {
      persistent: true,
      expiration: 1000 * 60 * 60 * 24 * 7 // 7 days
    });
  }

  private async rateLimiter(maxPerSecond: number) {
    const now = Date.now();
    if (!this.lastMessageTime) {
      this.lastMessageTime = now;
      return;
    }

    const elapsed = now - this.lastMessageTime;
    const minInterval = 1000 / maxPerSecond;
    
    if (elapsed < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
    }
    
    this.lastMessageTime = Date.now();
  }

  async consumeTweets(callback: (tweet: TweetData) => Promise<void>) {
    const queue = 'tweet_processing';
    await this.channel.assertQueue(queue);
    this.channel.consume(queue, async (msg: amqp.Message | null) => {

      if (msg) {
        const tweet = JSON.parse(msg.content.toString());
        await callback(tweet);
        this.channel.ack(msg);
      }
    });
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}
