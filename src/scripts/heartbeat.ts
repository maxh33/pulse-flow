import axios from 'axios';
import { errorCounter } from '../monitoring/metrics';
import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url('Invalid application URL'),
  HEARTBEAT_INTERVAL: z.string()
    .transform(Number)
    .refine(val => val >= 10000, 'Interval must be at least 10 seconds')
    .default('600000')
});

async function sendHeartbeat() {
  try {
    const env = envSchema.parse(process.env);
    
    console.log(`Starting heartbeat service for ${env.APP_URL}`);
    
    setInterval(async () => {
      try {
        const response = await axios.get(`${env.APP_URL}/healthz`, {
          timeout: 5000,
          validateStatus: status => status === 200
        });
        
        if (response.status === 200) {
          console.log('Heartbeat successful:', new Date().toISOString());
        }
      } catch (error) {
        console.error('Heartbeat failed:', error instanceof Error ? error.message : 'Unknown error');
        errorCounter.inc({ type: 'heartbeat_failure' });
      }
    }, env.HEARTBEAT_INTERVAL);

  } catch (error) {
    console.error('Heartbeat service failed to start:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Performing graceful shutdown...');
  process.exit(0);
});

sendHeartbeat(); 