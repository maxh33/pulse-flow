import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.config';
import { setupMetrics } from './monitoring/metrics';
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
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB Connected...');

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