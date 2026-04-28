const env = require('../config/env');
const { consumer } = require('./client');
const logger = require('../utils/logger');
const { processOrder } = require('../services/inventoryService');
const { publishInventoryEvent } = require('./producer');

let consumerConnected = false;

async function handleOrderMessage(message) {
  if (!message.value) {
    logger.warn('Skipping empty Kafka message');
    return;
  }

  let payload;

  try {
    payload = JSON.parse(message.value.toString());
  } catch (error) {
    logger.error('Failed to parse order event', {
      error: error.message,
      rawMessage: message.value ? message.value.toString() : null,
    });
    return;
  }

  if (payload.event !== 'ORDER_CREATED') {
    logger.info('Ignoring unsupported event', {
      event: payload.event,
    });
    return;
  }

  try {
    const inventoryEvent = await processOrder(payload);

    if (!inventoryEvent) {
      return;
    }

    await publishInventoryEvent(inventoryEvent);
  } catch (error) {
    logger.error('Failed to process order event', {
      orderId: payload.orderId,
      error: error.message,
      stack: error.stack,
    });

    if (payload.orderId) {
      try {
        await publishInventoryEvent({
          event: 'OUT_OF_STOCK',
          orderId: payload.orderId,
        });
      } catch (publishError) {
        logger.error('Failed to publish fallback inventory event', {
          orderId: payload.orderId,
          error: publishError.message,
          stack: publishError.stack,
        });
      }
    }
  }
}

async function startOrderConsumer() {
  if (!consumerConnected) {
    await consumer.connect();
    consumerConnected = true;
  }

  await consumer.subscribe({
    topic: env.kafka.topics.orderEvents,
    fromBeginning: env.kafka.fromBeginning,
  });

  logger.info('Kafka consumer subscribed', {
    topic: env.kafka.topics.orderEvents,
    groupId: env.kafka.groupId,
    fromBeginning: env.kafka.fromBeginning,
  });

  await consumer.run({
    partitionsConsumedConcurrently: 1,
    eachMessage: async ({ topic, partition, message }) => {
      const payloadPreview = message.value ? message.value.toString() : null;

      logger.info('Order event consumed', {
        topic,
        partition,
        key: message.key ? message.key.toString() : null,
        payload: payloadPreview,
      });

      await handleOrderMessage(message);
    },
  });
}

async function disconnectConsumer() {
  if (!consumerConnected) {
    return;
  }

  try {
    await consumer.stop();
  } catch (error) {
    logger.warn('Kafka consumer stop skipped', {
      error: error.message,
    });
  }

  await consumer.disconnect();
  consumerConnected = false;
  logger.info('Kafka consumer disconnected');
}

module.exports = {
  startOrderConsumer,
  disconnectConsumer,
};
