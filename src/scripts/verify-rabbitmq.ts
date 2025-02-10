import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import amqp from 'amqplib';
import { z } from 'zod';
import { errorCounter } from '../monitoring/metrics';

// Environment validation schema
const envSchema = z.object({
  RABBITMQ_URL: z.string().url('Invalid RabbitMQ connection string'),
  RABBITMQ_PASSWORD: z.string().min(12, 'Password too short'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

async function verifyRabbitMQConnection() {
  try {
    // Validate environment variables
    const env = envSchema.parse(process.env);

    // Determine connection URL based on environment
    const connectionUrl = env.NODE_ENV === 'production'
      ? `amqp://pulse_flow_user:${env.RABBITMQ_PASSWORD}@localhost:5672`
      : env.RABBITMQ_URL;

    console.log('🔄 Verifying RabbitMQ connection...');
    
    // Connection options with timeouts
    const connectionOptions = {
      timeout: 5000,  // 5 seconds connection timeout
      heartbeat: 30   // 30 seconds heartbeat
    };

    // Establish connection
    const connection = await amqp.connect(connectionUrl, connectionOptions);
    
    // Create channel
    const channel = await connection.createChannel();
    
    // Declare a test queue
    const testQueue = 'pulse_flow_test_queue';
    await channel.assertQueue(testQueue, { 
      durable: false,
      autoDelete: true
    });

    // Close connection
    await channel.close();
    await connection.close();

    console.log('✅ RabbitMQ connection verified successfully');
  } catch (error) {
    errorCounter.inc({ type: 'rabbitmq_verification' });
    console.error('❌ RabbitMQ verification failed:', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

verifyRabbitMQConnection();
