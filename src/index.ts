import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.config';
import { setupMetrics, pushMetrics } from './monitoring/metrics';
import { healthRoutes } from './routes/health.routes';
import { pingRoutes } from './routes/ping.routes';
import { errorHandler } from './middleware/errorHandler';
import { startMetricsScheduler } from './scripts/metrics-scheduler';
import mongoose from 'mongoose';
import { MessageQueue } from './services/message-queue';

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Metrics middleware
setupMetrics(app);

// Routes
app.use(healthRoutes);
app.use(pingRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
let server: any;
let metricsInterval: NodeJS.Timeout;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB Connected...');

    // Add RabbitMQ connection with retry
    const messageQueue = new MessageQueue(process.env.RABBITMQ_URL!);
    let retries = 0;
    const MAX_RETRIES = 5;

    while (retries < MAX_RETRIES) {
      try {
        await messageQueue.connect();
        console.log('RabbitMQ Connected...');
        break;
      } catch (error) {
        retries++;
        console.error(`RabbitMQ connection attempt ${retries} failed:`, error);
        if (retries === MAX_RETRIES) {
          throw new Error('Failed to connect to RabbitMQ after max retries');
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s between retries
      }
    }

    // Start Express server
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Start metrics collection
    metricsInterval = setInterval(async () => {
      try {
        await pushMetrics();
      } catch (error) {
        console.error('Metrics push failed:', error);
      }
    }, parseInt(process.env.METRICS_PUSH_INTERVAL || '15000'));

    // Enhanced graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Starting graceful shutdown...`);
      
      // Set a flag to stop accepting new requests
      app.disable('accept-connections');
      
      // Clear metrics interval
      clearInterval(metricsInterval);
      
      try {
        // Wait for existing requests to complete (max 5 seconds)
        const shutdownTimeout = setTimeout(() => {
          console.error('Forced shutdown after timeout');
          process.exit(1);
        }, 5000);

        // Close server gracefully
        await new Promise<void>((resolve) => {
          server.close(() => {
            clearTimeout(shutdownTimeout);
            resolve();
          });
        });

        // Disconnect from MongoDB
        await mongoose.disconnect();
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Use once() to prevent multiple handlers
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));

    // Start metrics scheduler
    startMetricsScheduler();

    // Add restart monitoring
    server.on('error', async (error: Error) => {
      console.error('Server error:', error);
      if (restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++;
        console.log(`Attempting restart ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        startServer();
      } else {
        console.error('Max restart attempts reached');
        process.exit(1);
      }
    });

    // Reset restart attempts on successful start
    server.once('listening', () => {
      restartAttempts = 0;
      console.log('Server successfully started');
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      console.log(`Attempting restart ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      startServer();
    } else {
      process.exit(1);
    }
  }
}

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});