import axios from 'axios';
import { errorCounter } from '../monitoring/metrics';
import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url('Invalid application URL'),
  HEARTBEAT_INTERVAL: z.string()
    .transform(Number)
    .refine(val => val >= 10000, 'Interval must be at least 10 seconds')
    .default('300000') // 5 minutes default
});

async function sendHeartbeat() {
  try {
    const env = envSchema.parse(process.env);
    let consecutiveFailures = 0;
    const MAX_FAILURES = 3;
    
    console.log(`Starting heartbeat service for ${env.APP_URL}`);
    
    const heartbeatInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${env.APP_URL}/healthz`, {
          timeout: 5000,
          validateStatus: status => status === 200,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.status === 200) {
          console.log('Heartbeat successful:', new Date().toISOString());
          consecutiveFailures = 0; // Reset counter on success
        }
      } catch (error) {
        console.error('Heartbeat failed:', error instanceof Error ? error.message : 'Unknown error');
        errorCounter.inc({ type: 'heartbeat_failure' });
        consecutiveFailures++;

        if (consecutiveFailures >= MAX_FAILURES) {
          console.error(`${MAX_FAILURES} consecutive failures detected. Restarting heartbeat service...`);
          clearInterval(heartbeatInterval);
          process.exit(1); // Exit with error to trigger restart
        }
      }
    }, env.HEARTBEAT_INTERVAL);

    // Additional ping at random intervals
    setInterval(async () => {
      try {
        await axios.get(`${env.APP_URL}/ping`, { 
          timeout: 2000,
          headers: { 'X-Heartbeat': 'true' }
        });
      } catch (error) {
        console.error('Additional ping failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }, Math.random() * 120000 + 60000); // Random interval between 1-3 minutes

  } catch (error) {
    console.error('Heartbeat service failed to start:', error);
    process.exit(1);
  }
}

// Enhanced shutdown handling
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}. Performing graceful shutdown...`);
  
  try {
    // Try to send one last heartbeat
    await axios.get(`${process.env.APP_URL}/healthz`);
  } catch (error) {
    console.error('Final heartbeat failed:', error);
  }
  
  process.exit(0);
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

sendHeartbeat(); 