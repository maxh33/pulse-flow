import { connectDB } from '../config/mongodb.config';
import mongoose from 'mongoose';

describe('MongoDB Connection', () => {
  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should connect to MongoDB successfully', async () => {
    try {
      await connectDB();
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error; 
    }
  }, 10000);
});