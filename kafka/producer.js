const env = require('../config/env');
const { producer } = require('./client');
const logger = require('../utils/logger');

let producerConnected = false;

async function connectProducer() {
  if (producerConnected) {
    return;
  }

  await producer.connect();
  producerConnected = true;

  logger.info('Kafka producer connected', {
    topic: env.kafka.topics.inventoryEvents,
  });
}

async function publishInventoryEvent(payload) {
  if (!payload) {
    return;
  }

  await producer.send({
    topic: env.kafka.topics.inventoryEvents,
    messages: [
      {
        value: JSON.stringify(payload),
      },
    ],
  });

  logger.info('Inventory event published', payload);
}

async function disconnectProducer() {
  if (!producerConnected) {
    return;
  }

  await producer.disconnect();
  producerConnected = false;
  logger.info('Kafka producer disconnected');
}

module.exports = {
  connectProducer,
  publishInventoryEvent,
  disconnectProducer,
};
