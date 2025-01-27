import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: String,
  status: String,
  timestamp: Date
});

export const connectDB = async () => {
    try {
      const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pulse-flow';
        await mongoose.connect(mongoURI);
        console.log('Mongodb Connected...');
    }   catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
