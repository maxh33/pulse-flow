import amqp from 'amqplib';

export const createRabbitMQConnection = async () => {
  const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  
  try {
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    
    // Declare queues with enhanced configuration
    await channel.assertQueue('tweet_processing', { 
      durable: true,  // Survive broker restart
      autoDelete: false,
      arguments: {
        'x-queue-type': 'classic',
        'x-max-length': 10000,  // Limit queue size
        'x-overflow': 'reject-publish'  // Prevent queue from growing indefinitely
      }
    });

    return { connection, channel };
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    throw error;
  }
};

export const rabbitMQConfig = {
  queues: {
    tweetProcessing: 'tweet_processing'
  },
  retryConfig: {
    maxRetries: 3,
    initialBackoff: 1000,
    backoffMultiplier: 2
  }
};
