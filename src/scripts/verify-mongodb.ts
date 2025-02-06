import mongoose from 'mongoose';
import { z } from 'zod';
import { errorCounter } from '../monitoring/metrics';

// Environment validation schema
const envSchema = z.object({
  MONGODB_URI: z.string().url('Invalid MongoDB connection string'),
  NODE_ENV: z.enum(['development', 'production', 'test'])
});

async function verifyConnection() {
  try {
    // Validate environment variables
    const env = envSchema.parse(process.env);
    
    // Connection options with timeouts
    const options = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 2000
    };

    console.log('🔄 Verifying MongoDB connection...');
    await mongoose.connect(env.MONGODB_URI, options);
    
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection not ready');
    }

    console.log('✅ MongoDB connection verified');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    errorCounter.inc({ type: 'mongodb_verification' });
    console.error('❌ MongoDB verification failed:', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

verifyConnection(); 