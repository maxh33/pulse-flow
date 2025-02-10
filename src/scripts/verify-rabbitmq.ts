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
    
    // Use the full URL in production, construct local URL in development
    const connectionUrl = process.env.NODE_ENV === 'production' 
      ? env.RABBITMQ_URL
      : `amqp://pulse_flow_user:${env.RABBITMQ_PASSWORD}@localhost:5672`;
    
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
        await channel.assertQueue('test_queue', { durable: false });
        
        console.log('✅ RabbitMQ connection verified successfully');
        
        await channel.close();
        await connection.close();
        
        process.exit(0);
      } catch (error) {
        lastError = error;
        console.error(`Connection attempt ${i + 1} failed:`, (error as Error).message);
        
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
