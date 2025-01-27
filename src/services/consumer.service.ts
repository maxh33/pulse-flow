import { kafka } from '../config/kafka.config';

export async function setupKafkaConsumer() {
  const consumer = kafka.consumer({ groupId: 'order-service-group' });
  
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders' });
  
  await consumer.run({
    eachMessage: async ({ message }) => {
      console.log('Received order:', message.value?.toString());
    },
  });
}
