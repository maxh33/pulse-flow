import mongoose from "mongoose";
import { errorCounter } from "../monitoring/metrics";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.warn("MongoDB URI is not defined, using default local URI");
      // Fallback to a default local URI if not specified
      process.env.MONGODB_URI = "mongodb://localhost:27017/pulse_flow";
    }

    await mongoose.connect(process.env.MONGODB_URI!, {
      // Add some recommended connection options
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: "majority",
    });

    console.log("MongoDB Connected successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    errorCounter.inc({ type: "mongodb_initial_connection" });
    throw error;
  }
};
