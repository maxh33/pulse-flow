import { config } from 'dotenv';
import { resolve } from 'path';

export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envPath = resolve(process.cwd(), '.env');
  
  const result = config({ path: envPath });
  
  if (result.error) {
    if (nodeEnv === 'production') {
      console.log('ℹ️ No .env file found, using system environment variables');
    } else {
      console.warn('⚠️ No .env file found or error loading it');
    }
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'GRAFANA_PUSH_URL',
    'GRAFANA_USERNAME', 
    'GRAFANA_API_KEY',
    'METRICS_PUSH_INTERVAL'
  ];

  const missing = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error(`🚨 Security Warning: Missing critical environment variables: ${missing.join(', ')}`);
    
    // In production, exit the process
    if (nodeEnv === 'production') {
      process.exit(1);
    }
  }

  // Additional security checks for production
  if (nodeEnv === 'production') {
    // Validate Grafana API key format (if it starts with glc_)
    if (process.env.GRAFANA_API_KEY && !process.env.GRAFANA_API_KEY.startsWith('glc_')) {
      console.error('🚨 Invalid Grafana API key format');
      process.exit(1);
    }

    // Validate Grafana Push URL
    if (!process.env.GRAFANA_PUSH_URL?.includes('grafana.net')) {
      console.error('🚨 Invalid Grafana Push URL');
      process.exit(1);
    }
  }

  // Log successful configuration without exposing secrets
  console.log('📝 Environment configuration loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    GRAFANA_PUSH_URL: process.env.GRAFANA_PUSH_URL,
    GRAFANA_USERNAME: '****' + process.env.GRAFANA_USERNAME?.slice(-4),
    GRAFANA_API_KEY: '****' + process.env.GRAFANA_API_KEY?.slice(-4),
    METRICS_PUSH_INTERVAL: process.env.METRICS_PUSH_INTERVAL
  });
} 