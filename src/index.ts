import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.config';
import { setupMetrics, pushMetrics } from './monitoring/metrics';
import { healthRoutes } from './routes/health.routes';
import { pingRoutes } from './routes/ping.routes';
import { errorHandler } from './middleware/errorHandler';

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

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB Connected...');

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

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Starting graceful shutdown...`);
      
      // Clear metrics interval
      clearInterval(metricsInterval);
      
      // Close server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force close after timeout
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});