import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.config';
import { setupMetrics, startMetricsCollection } from './monitoring/metrics';
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

const SHUTDOWN_TIMEOUT = 30000; // Increase to 30 seconds

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
    const stopMetrics = await startMetricsCollection();

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Starting graceful shutdown...`);
      
      // Stop metrics collection first
      if (stopMetrics) {
        await stopMetrics();
      }

      // Close server with timeout
      const serverClosed = new Promise((resolve) => {
        server.close(() => {
          console.log('HTTP server closed');
          resolve(true);
        });
      });

      try {
        await Promise.race([
          serverClosed,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Server close timed out')), SHUTDOWN_TIMEOUT)
          )
        ]);
        process.exit(0);
      } catch (error) {
        console.error('Shutdown error:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => shutdown(signal));
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});