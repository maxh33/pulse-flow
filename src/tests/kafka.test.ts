// import { kafka, validateKafkaConnection } from '../config/kafka.config'; 
// import { v4 as uuidv4 } from 'uuid';
// import dotenv from 'dotenv';

// dotenv.config();

// describe('Kafka Connection', () => {
//   it('should successfully connect to Kafka', async () => {
//     try {
//       const isConnected = await validateKafkaConnection();
//       expect(isConnected).toBe(true);
//     } catch (error) {
//       console.error('Kafka connection failed:', error);
//       throw new Error('Kafka connection failed');
//     }
//   }, 10000);
// });

// describe('Kafka Message Flow', () => {
//   const uniqueSuffix = uuidv4();
//   const topic = `test-topic-${uniqueSuffix}`;

//   let producer: any;
//   let consumer: any;
//   let admin: any;

//   beforeAll(async () => {
//     admin = kafka.admin();
//     await admin.connect();
//     await admin.createTopics({
//       topics: [{ topic }],
//       waitForLeaders: true,
//     });
//   }, 30000);

//   afterAll(async () => {
//     try {
//       await admin.deleteTopics({ topics: [topic] });
//     } finally {
//       await admin.disconnect();
//     }
//   }, 30000);

//   it('should produce and consume messages', async () => {
//     producer = kafka.producer();
//     await producer.connect();

//     consumer = kafka.consumer({ groupId: `test-group-${uniqueSuffix}` });
//     await consumer.connect();
//   });
// });