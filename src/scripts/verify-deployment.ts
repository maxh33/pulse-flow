import axios from 'axios';
import { z } from 'zod';
import { errorCounter } from '../monitoring/metrics';

const envSchema = z.object({
  APP_URL: z.string().url(),
  HEALTH_CHECK_RETRIES: z.string().transform(Number).default('3'),
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('5000')
});

async function verifyDeployment() {
  try {
    const env = envSchema.parse(process.env);
    const maxRetries = env.HEALTH_CHECK_RETRIES;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(`${env.APP_URL}/healthz`);
        if (response.status === 200) {
          console.log('✅ Application health check passed');
          process.exit(0);
        }
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw error;
        }
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