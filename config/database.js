const mongoose = require('mongoose');

const env = require('./env');
const logger = require('../utils/logger');

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  logger.info('MongoDB connected', {
    database: mongoose.connection.name,
    host: mongoose.connection.host,
  });
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
