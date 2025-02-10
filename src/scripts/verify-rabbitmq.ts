import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

import amqp from 'amqplib';
import { z } from 'zod';
import { errorCounter } from '../monitoring/metrics';

// Environment validation schema
const envSchema = z.object({
  RABBITMQ_URL: z.string().url('Invalid RabbitMQ URL'),
  RABBITMQ_PASSWORD: z.string().min(1, 'RabbitMQ password is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

async function verifyRabbitMQ() {
  console.log(`🔄 Verifying RabbitMQ connection in ${process.env.NODE_ENV} environment...`);
  
  try {
    const env = envSchema.parse(process.env);
    
    // Explicitly construct connection URL with credentials
    const connectionUrl = `amqp://pulse_flow_user:${env.RABBITMQ_PASSWORD}@localhost:5672`;
    
    // Add retry logic for production environment
    const maxRetries = process.env.NODE_ENV === 'production' ? 5 : 1;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const connection = await amqp.connect(connectionUrl, {
          timeout: 5000,
          heartbeat: 30
        });
        
        const channel = await connection.createChannel();
        
        // Test queue declaration
        await channel.assertQueue('test_queue', { durable: false });
        
        console.log('✅ RabbitMQ connection verified successfully');
        
        // Close connection
        await channel.close();
        await connection.close();
        
        process.exit(0);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          console.log(`Retry attempt ${i + 1} of ${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s between retries
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      errorCounter.inc({ type: 'rabbitmq_verification' });
    }
    console.error('❌ RabbitMQ verification failed:', error);
    process.exit(process.env.NODE_ENV === 'production' ? 1 : 0);
  }
}

verifyRabbitMQ();
