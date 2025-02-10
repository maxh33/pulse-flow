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
      durable: true,  // Survive broker restart
      autoDelete: false,
      arguments: {
        'x-queue-type': 'classic',
        'x-max-length': 10000,  // Limit queue size
        'x-overflow': 'reject-publish'  // Prevent queue from growing indefinitely
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
  retryConfig: {
    maxRetries: 3,
    initialBackoff: 1000,
    backoffMultiplier: 2
  }
};
