const http = require('http');

const app = require('./app');
const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./utils/logger');
const { connectProducer, disconnectProducer } = require('./kafka/producer');
const { startOrderConsumer, disconnectConsumer } = require('./kafka/consumer');

let server;
let isShuttingDown = false;

async function bootstrap() {
  try {
    await connectDatabase();
    await connectProducer();
    await startOrderConsumer();

    server = http.createServer(app);
    server.listen(env.port, () => {
      logger.info('Inventory service started', {
        port: env.port,
        environment: env.nodeEnv,
      });
    });
  } catch (error) {
    logger.error('Failed to bootstrap inventory service', {
      error: error.message,
      stack: error.stack,
    });

    await Promise.allSettled([
      disconnectConsumer(),
      disconnectProducer(),
      disconnectDatabase(),
    ]);

    process.exit(1);
  }
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info('Shutting down inventory service', { signal });

  try {
    await disconnectConsumer();
    await disconnectProducer();
    await disconnectDatabase();
    await serverClose();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

function serverClose() {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', {
    error: error.message,
    stack: error.stack,
  });
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('UNCAUGHT_EXCEPTION');
});

bootstrap();
