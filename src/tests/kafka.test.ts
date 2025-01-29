import { kafka, validateKafkaConnection } from '../config/kafka.config';
import { v4 as uuidv4 } from 'uuid';

describe('Kafka Connection', () => {
  it('should successfully connect to Kafka', async () => {
    const isConnected = await validateKafkaConnection();
    expect(isConnected).toBe(true);
  });
});

describe('Kafka Message Flow', () => {
  const uniqueSuffix = uuidv4();
  const topic = `test-topic-${uniqueSuffix}`;
  const message = { key: 'testKey', value: 'testValue' };

  let producer: any;
  let consumer: any;
  let admin: any;

  beforeAll(async () => {
    // Setup: Create a unique topic
    admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic }],
      waitForLeaders: true,
    });
    await admin.disconnect();
  });

  afterAll(async () => {
    // Cleanup: Delete the unique topic
    admin = kafka.admin();
    await admin.connect();
    await admin.deleteTopics({ topics: [topic] });
    await admin.disconnect();
  });

  it('should produce a message to Kafka', async () => {
    producer = kafka.producer();
    await producer.connect();
    await expect(
      producer.send({
        topic,
        messages: [message],
      })
    ).resolves.not.toThrow();
    await producer.disconnect();
  });

  it('should consume the message from Kafka', async () => {
    consumer = kafka.consumer({ groupId: `test-group-${uniqueSuffix}` });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    const receivedMessages: typeof message[] = [];

    // Listen for messages and resolve when the expected message is received
    const messagePromise = new Promise<void>((resolve, reject) => {
      consumer.run({
        eachMessage: async ({ message }: { message: { key: Buffer | null; value: Buffer | null } }) => {
          if (message.key && message.value) {
            receivedMessages.push({
              key: message.key.toString(),
              value: message.value.toString(),
            });
            if (receivedMessages.length === 1) {
              resolve();
            }
          }
        },
      });

      // Timeout after 5 seconds to prevent hanging tests
      setTimeout(() => {
        reject(new Error('Message not received within timeout'));
      }, 5000);
    });

    try {
      await messagePromise;
    } catch (error) {
      // If message not received, fail the test
      throw error;
    } finally {
      await consumer.disconnect();
    }

    expect(receivedMessages).toContainEqual(message);
  });
});