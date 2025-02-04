import mongoose from 'mongoose';
import { errorCounter } from '../monitoring/metrics';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MongoDB URI is not defined');
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      waitQueueTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority'
    });

    // Add connection monitoring
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB Connection Error:', err);
      errorCounter.inc({ type: 'mongodb_connection' });
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB Disconnected');
      errorCounter.inc({ type: 'mongodb_disconnect' });
    });

    return mongoose.connection;

  } catch (error) {
    console.error('MongoDB connection error:', error);
    errorCounter.inc({ type: 'mongodb_initial_connection' });
    throw error; // Don't exit process, let caller handle it
  }
};