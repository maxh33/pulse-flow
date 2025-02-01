import { Kafka, KafkaConfig } from 'kafkajs';
import { ConnectionOptions } from 'tls';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const saveCertToFile = (cert: string, filename: string) => {
  fs.writeFileSync(path.join(__dirname, filename), cert);
  return path.join(__dirname, filename);
};

export const createKafkaClient = () => {
  try {
    // Save certificates to files
    const trustedCertPath = saveCertToFile(process.env.KAFKA_TRUSTED_CERT || '', 'ca.cert');
    const clientCertPath = saveCertToFile(process.env.KAFKA_CLIENT_CERT || '', 'client.cert');
    const clientKeyPath = saveCertToFile(process.env.KAFKA_CLIENT_CERT_KEY || '', 'client.key');

    const brokers = (process.env.KAFKA_URL || '').split(',').map(url => 
      url.replace('kafka+ssl://', 'ssl://')
    );

    console.log('Brokers:', brokers);

    if (!brokers.length) {
      throw new Error('No Kafka brokers configured');
    }

    const ssl: ConnectionOptions = {
      rejectUnauthorized: true,
      ca: fs.readFileSync(trustedCertPath),
      cert: fs.readFileSync(clientCertPath),
      key: fs.readFileSync(clientKeyPath)
    };

    console.log('SSL Configuration:', {
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
    console.error('Error creating Kafka client:', error);
    throw error;
  }
};

export const validateKafkaConnection = async (): Promise<boolean> => {
  const admin = kafka.admin();
  try {
    console.log('Attempting to connect to Kafka...');
    await admin.connect();
    const topics = await admin.listTopics();
    console.log('Connected to Kafka successfully. Available topics:', topics);
    return true;
  } catch (error) {
    console.error('Kafka connection validation error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    return false;
  } finally {
    try {
      await admin.disconnect();
    } catch (error) {
      console.error('Error disconnecting admin:', error);
    }
  }
};

export const kafka = createKafkaClient();