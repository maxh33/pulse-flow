import { kafka } from '../config/kafka.config';
import { KafkaMessage, Consumer } from 'kafkajs';
import { errorCounter } from '../monitoring/metrics';
import { TweetData } from '../models/tweet';

let consumer: Consumer | null = null;

const processMessage = async (message: KafkaMessage): Promise<void> => {
  try {
    if (!message.value) {
      throw new Error('Empty message value');
    }

    const tweetData = JSON.parse(message.value.toString()) as TweetData;
    console.log('Processing tweet:', tweetData.tweetId);
    
    // Add your processing logic here
    
  } catch (error) {
    console.error('Error processing message:', error);
    errorCounter.inc({ type: 'message_processing' });
    throw error;
  }
};

export async function setupKafkaConsumer(): Promise<void> {
  try {
    consumer = kafka.consumer({ 
      groupId: 'tweet-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    
    await consumer.connect();
    await consumer.subscribe({ topic: 'tweets', fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ message }) => {
        await processMessage(message);
      },
    });

    console.log('Kafka consumer setup complete');
  } catch (error) {
    console.error('Error setting up Kafka consumer:', error);
    errorCounter.inc({ type: 'consumer_setup' });
    throw error;
  }
}

export async function shutdownConsumer(): Promise<void> {
  if (consumer) {
    try {
      await consumer.disconnect();
      consumer = null;
      console.log('Kafka consumer disconnected');
    } catch (error) {
      console.error('Error disconnecting consumer:', error);
      errorCounter.inc({ type: 'consumer_shutdown' });
      throw error;
    }
  }
}