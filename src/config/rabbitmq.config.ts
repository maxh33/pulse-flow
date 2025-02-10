import amqp from 'amqplib';

export const createRabbitMQConnection = async () => {
  if (!process.env.RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL environment variable is not set');
  }

  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL, {
      heartbeat: 60,
      timeout: 10000
    });
    
    const channel = await connection.createChannel();
    
    // Declare queues with enhanced configuration
    await channel.assertQueue('tweet_processing', { 
      durable: true,
      autoDelete: false,
      arguments: {
        'x-queue-type': 'classic',
        'x-max-length': rabbitMQConfig.limits.maxQueueLength,
        'x-max-age': '21d',  // Remove messages after 21 days
        'x-overflow': 'reject-publish'
      }
    });

    console.log('Successfully connected to RabbitMQ');
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
  limits: {
    maxQueueLength: 9000,  // Keep under 10,000 limit
    maxQueues: 90,         // Keep under 100 limit
    maxConnections: 15,    // Keep under 20 limit
    cleanupInterval: 14 * 24 * 60 * 60 * 1000, // 14 days (half of max idle time)
  },
  retryConfig: {
    maxRetries: 3,
    initialBackoff: 1000,
    backoffMultiplier: 2
  }
};
