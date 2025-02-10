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
  RABBITMQ_URL: z.string(),
  RABBITMQ_PASSWORD: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

async function verifyRabbitMQ() {
  console.log(`🔄 Verifying RabbitMQ connection in ${process.env.NODE_ENV} environment...`);
  
  try {
    const env = envSchema.parse(process.env);
    
    // Always use the full URL from environment
    const connectionUrl = env.RABBITMQ_URL;
    
    console.log('Attempting to connect to RabbitMQ at:', connectionUrl.replace(/:[^:]*@/, ':****@'));
    
    const maxRetries = process.env.NODE_ENV === 'production' ? 5 : 1;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const connection = await amqp.connect(connectionUrl, {
          timeout: 10000,
          heartbeat: 60
        });
        
        const channel = await connection.createChannel();
        console.log('Channel created successfully');
        
        // Test queue declaration
        const queueName = 'test_queue';
        await channel.assertQueue(queueName, { 
          durable: false,
          autoDelete: true 
        });
        console.log('Test queue declared successfully');
        
        // Cleanup test queue
        await channel.deleteQueue(queueName);
        console.log('Test queue cleaned up');
        
        await channel.close();
        await connection.close();
        
        console.log('✅ RabbitMQ connection verified successfully');
        process.exit(0);
      } catch (error) {
        lastError = error;
        console.error(`Connection attempt ${i + 1} failed:`, error);
        
        if (i < maxRetries - 1) {
          console.log(`Retrying in 5 seconds... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
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
