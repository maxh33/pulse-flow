import { Kafka, KafkaConfig } from 'kafkajs';
import { ConnectionOptions } from 'tls';
import dotenv from 'dotenv';

dotenv.config();

export const createKafkaClient = () => {
  try {
    const brokers = (process.env.KAFKA_URL || '').split(',').map(url => 
      url.replace('kafka+ssl://', 'ssl://')
    );

    if (!brokers.length) {
      throw new Error('No Kafka brokers configured');
    }

    // Certificates directly from environment variables
    const ssl: ConnectionOptions = {
      rejectUnauthorized: true,
      ca: process.env.KAFKA_TRUSTED_CERT,
      cert: process.env.KAFKA_CLIENT_CERT,
      key: process.env.KAFKA_CLIENT_CERT_KEY
    };

    // Only log non-sensitive information
    console.log('Kafka Configuration:', {
      brokers,
      hasCa: !!ssl.ca,
      hasCert: !!ssl.cert,
      hasKey: !!ssl.key
    });

    const config: KafkaConfig = {
      clientId: 'pulse-flow',
      brokers,
      ssl,
      connectionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 5
      }
    };

    return new Kafka(config);
  } catch (error) {
    console.error('Error creating Kafka client');
    throw error;
  }
};

export const validateKafkaConnection = async (): Promise<boolean> => {
  const admin = kafka.admin();
  try {
    console.log('Attempting to connect to Kafka...');
    await admin.connect();
    const topics = await admin.listTopics();
    console.log('Connected to Kafka successfully. Topics found:', topics.length);
    return true;
  } catch (error) {
    console.error('Kafka connection validation error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  } finally {
    try {
      await admin.disconnect();
    } catch (error) {
      console.error('Error disconnecting admin:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
};

export const kafka = createKafkaClient();