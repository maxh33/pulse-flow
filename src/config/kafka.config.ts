import { Kafka } from 'kafkajs';



export const kafka = new Kafka({

  clientId: 'pulse-flow',

  brokers: ['kafka-broker:9092']

});
