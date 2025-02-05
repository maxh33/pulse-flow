import axios from 'axios';
import { z } from 'zod';
import { errorCounter } from '../monitoring/metrics';

const envSchema = z.object({
  APP_URL: z.string().url().default('http://pulse-flow-app:3000'),
  HEALTH_CHECK_RETRIES: z.string().transform(Number).default('5'),
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('5000')
});

async function verifyDeployment() {
  try {
    console.log('Starting deployment verification...');
    console.log('Environment variables:', {
      APP_URL: process.env.APP_URL,
      HEALTH_CHECK_RETRIES: process.env.HEALTH_CHECK_RETRIES,
      HEALTH_CHECK_INTERVAL: process.env.HEALTH_CHECK_INTERVAL
    });

    const env = envSchema.parse(process.env);
    const maxRetries = env.HEALTH_CHECK_RETRIES;
    let retries = 0;

    // Create axios instance with custom configuration
    const instance = axios.create({
      timeout: 5000,
      validateStatus: status => status === 200
    });

    while (retries < maxRetries) {
      try {
        console.log(`Attempt ${retries + 1}/${maxRetries} - Checking ${env.APP_URL}/healthz`);
        const response = await instance.get(`${env.APP_URL}/healthz`);
        
        if (response.status === 200) {
          console.log('✅ Application health check passed');
          process.exit(0);
        }
      } catch (error) {
        retries++;
        console.log(`Health check attempt ${retries} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (retries === maxRetries) {
          throw error;
        }
        console.log(`Waiting ${env.HEALTH_CHECK_INTERVAL}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, env.HEALTH_CHECK_INTERVAL));
      }
    }
  } catch (error) {
    errorCounter.inc({ type: 'deployment_verification' });
    console.error('❌ Deployment verification failed:', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

verifyDeployment(); 