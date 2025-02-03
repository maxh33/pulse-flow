import { Kafka, KafkaConfig, RetryOptions } from 'kafkajs';
import { ConnectionOptions } from 'tls';
import { errorCounter, kafkaPublishCounter } from '../monitoring/metrics';
import CircuitBreaker from 'opossum';

const retryOptions: RetryOptions = {
  initialRetryTime: 100,
  retries: 5,
  maxRetryTime: 30000,
  factor: 0.2,
};

export class KafkaService {
  private static instance: KafkaService;
  private kafka: Kafka;
  private circuitBreaker: CircuitBreaker | undefined;
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval = 60000; // 1 minute

  private constructor() {
    this.kafka = this.createKafkaClient();
    this.setupCircuitBreaker();
  }

  public static getInstance(): KafkaService {
    if (!KafkaService.instance) {
      KafkaService.instance = new KafkaService();
    }
    return KafkaService.instance;
  }

  private createKafkaClient(): Kafka {
    try {
      const brokers = (process.env.KAFKA_URL || '').split(',')
        .map(url => url.replace('kafka+ssl://', 'ssl://'));

      if (!brokers.length) {
        throw new Error('No Kafka brokers configured');
      }

      const ssl: ConnectionOptions = {
        rejectUnauthorized: true,
        ca: process.env.KAFKA_TRUSTED_CERT,
        cert: process.env.KAFKA_CLIENT_CERT,
        key: process.env.KAFKA_CLIENT_CERT_KEY
      };

      const config: KafkaConfig = {
        clientId: 'pulse-flow',
        brokers,
        ssl,
        connectionTimeout: 30000,
        retry: retryOptions,
      };

      return new Kafka(config);
    } catch (error) {
      errorCounter.inc({ type: 'kafka_client_creation' });
      throw error;
    }
  }

  public async validateKafkaConnection(): Promise<boolean> {
    const admin = this.kafka.admin();
    try {
      console.log('Validating Kafka connection...');
      await admin.connect();
      const topics = await admin.listTopics();
      console.log('Kafka connection validated. Available topics:', topics.length);
      this.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      console.error('Kafka connection validation error:', 
        error instanceof Error ? error.message : 'Unknown error');
      errorCounter.inc({ type: 'kafka_validation' });
      return false;
    } finally {
      try {
        await admin.disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting admin client:', 
          disconnectError instanceof Error ? disconnectError.message : 'Unknown error');
      }
    }
  }

  public async checkHealth(): Promise<{
    isHealthy: boolean;
    lastCheck: Date | null;
    details: Record<string, any>;
  }> {
    const now = new Date();
    const needsCheck = !this.lastHealthCheck || 
      (now.getTime() - this.lastHealthCheck.getTime()) > this.healthCheckInterval;

    let isHealthy = false;
    const details: Record<string, any> = {
      circuitBreakerState: this.circuitBreaker?.status || 'unknown',
      lastHealthCheck: this.lastHealthCheck,
    };

    if (needsCheck) {
      try {
        isHealthy = await this.validateKafkaConnection();
        details.connectionStatus = isHealthy ? 'connected' : 'disconnected';
      } catch (error) {
        details.error = error instanceof Error ? error.message : 'Unknown error';
        isHealthy = false;
      }
    } else {
      isHealthy = true;
      details.status = 'Using cached health check';
    }

    return {
      isHealthy,
      lastCheck: this.lastHealthCheck,
      details
    };
  }

  private setupCircuitBreaker() {
    this.circuitBreaker = new CircuitBreaker(async (message: any) => {
      const producer = this.kafka.producer();
      await producer.connect();
      await producer.send(message);
      await producer.disconnect();
      kafkaPublishCounter.inc({ topic: message.topic });
    }, {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    this.circuitBreaker.on('open', () => {
      console.warn('Kafka circuit breaker opened');
      errorCounter.inc({ type: 'kafka_circuit_open' });
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.info('Kafka circuit breaker attempting reset');
    });

    this.circuitBreaker.on('close', () => {
      console.info('Kafka circuit breaker closed');
    });
  }

  public async publishMessage(topic: string, messages: any[]): Promise<void> {
    try {
      if (!this.circuitBreaker) {
        throw new Error('CircuitBreaker is not initialized');
      }

      // Validate connection before publishing if last check is too old
      if (!this.lastHealthCheck || 
          (new Date().getTime() - this.lastHealthCheck.getTime()) > this.healthCheckInterval) {
        const isHealthy = await this.validateKafkaConnection();
        if (!isHealthy) {
          throw new Error('Kafka connection validation failed');
        }
      }

      await this.circuitBreaker.fire({ topic, messages });
    } catch (error) {
      errorCounter.inc({ type: 'kafka_publish' });
      throw error;
    }
  }
}

export const kafkaService = KafkaService.getInstance();
export const kafka = kafkaService['kafka'];