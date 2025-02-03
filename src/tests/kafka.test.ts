import { KafkaService } from '../config/kafka.config';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { errorCounter, kafkaPublishCounter } from '../monitoring/metrics';
import { Kafka } from 'kafkajs';
import { Registry, MetricObjectWithValues, MetricValue, MetricType } from 'prom-client';

interface MetricData extends MetricObjectWithValues<MetricValue<string>> {
  name: string;
  help: string;
  type: MetricType;
  values: Array<{
    value: number;
    labels: Record<string, string>;
  }>;
}

dotenv.config();

describe('KafkaService', () => {
  let kafkaService: KafkaService;
  const uniqueSuffix = uuidv4();
  const topic = `test-topic-${uniqueSuffix}`;

  beforeAll(() => {
    kafkaService = KafkaService.getInstance();
  });

  describe('Connection and SSL Configuration', () => {
    it('should have valid SSL configuration', () => {
      // Access private kafka instance using type assertion
      const kafka = (kafkaService as any)['kafka'] as Kafka;
      const config = kafka.producer().connect as any;
      expect(config.ssl).toBeDefined();
      expect(config.ssl.ca).toBeDefined();
      expect(config.ssl.cert).toBeDefined();
      expect(config.ssl.key).toBeDefined();
      expect(config.ssl.rejectUnauthorized).toBe(true);
    });

    it('should successfully connect to Kafka with SSL', async () => {
      const isValid = await kafkaService.validateKafkaConnection();
      expect(isValid).toBe(true);
    }, 10000);
  });
  // OK
  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await kafkaService.checkHealth();
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('lastCheck');
      expect(health).toHaveProperty('details');
    });
    // OK
    it('should cache health check results', async () => {
      const firstCheck = await kafkaService.checkHealth();
      const secondCheck = await kafkaService.checkHealth();
      expect(secondCheck.lastCheck).toEqual(firstCheck.lastCheck);
    });
  });

  describe('Message Publishing with Circuit Breaker', () => {
    let producer: any;
    let consumer: any;
    
    beforeAll(async () => {
      const kafka = (kafkaService as any)['kafka'] as Kafka;
      const admin = kafka.admin();
      await admin.connect();
      await admin.createTopics({
        topics: [{ topic }],
        waitForLeaders: true,
      });
      await admin.disconnect();
    }, 30000);

    beforeEach(async () => {
      const kafka = (kafkaService as any)['kafka'] as Kafka;
      producer = kafka.producer();
      consumer = kafka.consumer({ groupId: `test-group-${uniqueSuffix}` });
      await producer.connect();
      await consumer.connect();
    });

    afterEach(async () => {
      await producer.disconnect();
      await consumer.disconnect();
    });

    afterAll(async () => {
      const kafka = (kafkaService as any)['kafka'] as Kafka;
      const admin = kafka.admin();
      await admin.connect();
      try {
        await admin.deleteTopics({ topics: [topic] });
      } finally {
        await admin.disconnect();
      }
    }, 30000);

    it('should increment publish counter on successful message', async () => {
      const registry = new Registry();
      await registry.registerMetric(kafkaPublishCounter);
      
      const initialMetrics = (await registry.getMetricsAsJSON()) as unknown as MetricData[];
      const initialCount = initialMetrics.find(
        (m: MetricData) => m.name === 'kafka_messages_published' && 
        m.values.some(v => v.labels.topic === topic)
      )?.values[0]?.value || 0;
      
      await kafkaService.publishMessage(topic, [{ value: 'test' }]);
      
      const finalMetrics = (await registry.getMetricsAsJSON()) as unknown as MetricData[];
      const finalCount = finalMetrics.find(
        (m: MetricData) => m.name === 'kafka_messages_published' && 
        m.values.some(v => v.labels.topic === topic)
      )?.values[0]?.value || 0;
      
      expect(finalCount).toBe(initialCount + 1);
    });
  
    it('should increment error counter on failure', async () => {
      const registry = new Registry();
      await registry.registerMetric(errorCounter);
      
      const initialMetrics = (await registry.getMetricsAsJSON()) as unknown as MetricData[];
      const initialCount = initialMetrics.find(
        (m: MetricData) => m.name === 'error_count' && 
        m.values.some(v => v.labels.type === 'kafka_publish')
      )?.values[0]?.value || 0;
  
      try {
        await kafkaService.publishMessage('invalid-topic', [{ value: 'test' }]);
      } catch {
        // Expected error
      }
  
      const finalMetrics = (await registry.getMetricsAsJSON()) as unknown as MetricData[];
      const finalCount = finalMetrics.find(
        (m: MetricData) => m.name === 'error_count' && 
        m.values.some(v => v.labels.type === 'kafka_publish')
      )?.values[0]?.value || 0;
      
      expect(finalCount).toBe(initialCount + 1);
    });

    it('should retry failed operations according to retry options', async () => {
      const startTime = Date.now();
      try {
        await kafkaService.publishMessage('non-existent-topic', [{ value: 'test' }]);
      } catch {
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(500); // Assuming multiple retry attempts
      }
    }, 20000);
  });
});