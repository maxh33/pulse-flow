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
        'x-overflow': 'reject-publish',
        'x-message-ttl': 1000 * 60 * 60 * 24 * 7, // 7 days in milliseconds
        'x-dead-letter-exchange': 'dlx.tweet_processing'
      }
    });

    // Declare dead letter exchange and queue
    await channel.assertExchange('dlx.tweet_processing', 'direct', { durable: true });
    await channel.assertQueue('tweet_processing.dlq', {
      durable: true,
      arguments: {
        'x-queue-type': 'classic',
        'x-max-length': 1000,
        'x-message-ttl': 1000 * 60 * 60 * 24 * 3 // 3 days
      }
    });
    await channel.bindQueue('tweet_processing.dlq', 'dlx.tweet_processing', '');

    console.log('Successfully connected to RabbitMQ and created queues');
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
