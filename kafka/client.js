const { Kafka, logLevel } = require('kafkajs');

const env = require('../config/env');

const kafka = new Kafka({
  clientId: env.kafka.clientId,
  brokers: env.kafka.brokers,
  logLevel: logLevel.NOTHING,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: env.kafka.groupId,
});

module.exports = {
  producer,
  consumer,
};
