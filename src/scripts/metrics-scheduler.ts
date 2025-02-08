import { pushMetrics } from '../monitoring/metrics';
import { metricsConfig } from '../config/metrics.config';

export function startMetricsScheduler() {
  // Push metrics at configured interval
  setInterval(async () => {
    try {
      await pushMetrics();
    } catch (error) {
      console.error('Scheduled metrics push failed:', error);
    }
  }, metricsConfig.pushInterval);

  console.log(`Metrics scheduler started. Pushing every ${metricsConfig.pushInterval}ms`);
} 