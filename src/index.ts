import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.config';
import { orderRoutes } from './routes/order.routes';
import { setupMetrics } from './monitoring/metrics';
import { setupKafkaConsumer } from './services/consumer.service';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Metrics middleware
setupMetrics(app);

// Routes
app.use('/api/orders', orderRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB Connected...');

    // Setup Kafka Consumer
    await setupKafkaConsumer();
    console.log('Kafka Consumer Setup Complete...');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});