import { Kafka, logLevel } from 'kafkajs';

const createKafkaClient = () => {
  const brokers = process.env.KAFKA_BROKERS;
  const clientCert = process.env.KAFKA_CLIENT_CERT?.replace(/\\n/g, '\n');
  const clientCertKey = process.env.KAFKA_CLIENT_CERT_KEY?.replace(/\\n/g, '\n');
  const trustedCert = process.env.KAFKA_TRUSTED_CERT?.replace(/\\n/g, '\n');

  // Debugging: Log whether each variable is set
  console.log('KAFKA_BROKERS:', brokers ? 'Set' : 'Not Set');
  console.log('KAFKA_CLIENT_CERT:', clientCert ? 'Set' : 'Not Set');
  console.log('KAFKA_CLIENT_CERT_KEY:', clientCertKey ? 'Set' : 'Not Set');
  console.log('KAFKA_TRUSTED_CERT:', trustedCert ? 'Set' : 'Not Set');

  if (!brokers || !clientCert || !clientCertKey || !trustedCert) {
    throw new Error('Missing Kafka configuration');
  }

  return new Kafka({
    clientId: 'pulse-flow',
    brokers: brokers.split(',').map(broker => broker.replace('kafka+ssl://', '')),
    ssl: {
      rejectUnauthorized: true,
      cert: clientCert,
      key: clientCertKey,
      ca: trustedCert,
    },
    retry: {
      initialRetryTime: 100,
      retries: 8
    },
    logLevel: logLevel.ERROR
  });
};

export const kafka = createKafkaClient();

// connection management
export const validateKafkaConnection = async () => {
  const admin = kafka.admin();
  try {
    await admin.connect();
    await admin.listTopics();
    return true;
  } catch (error) {
    console.error('Kafka connection error:', error);
    return false;
  } finally {
    await admin.disconnect();
  }
};