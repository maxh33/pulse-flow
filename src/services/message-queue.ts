import amqp from 'amqplib';
import { TweetData } from '../models/tweet';

export class MessageQueue {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async connect(url: string) {
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
  }

  async publishTweet(tweet: TweetData) {
    const queue = 'tweet_processing';
    await this.channel.assertQueue(queue);
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(tweet)));
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
}
