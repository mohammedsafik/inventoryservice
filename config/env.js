const dotenv = require('dotenv');

dotenv.config();

function readEnv(name, fallback) {
  const value = process.env[name];

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBrokers(value, name) {
  const brokers = value
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  if (!brokers.length) {
    throw new Error(
      `Environment variable ${name} must include at least one broker`
    );
  }

  return brokers;
}

function toRoutePath(value, name) {
  if (!value.startsWith('/')) {
    throw new Error(`Environment variable ${name} must start with "/"`);
  }

  if (value === '/') {
    return value;
  }

  return value.replace(/\/+$/, '');
}

function toBoolean(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

module.exports = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  serviceName: readEnv('SERVICE_NAME', 'inventory-service'),
  port: toNumber(process.env.PORT, 4003),
  healthRoutePath: toRoutePath(readEnv('HEALTH_ROUTE_PATH'), 'HEALTH_ROUTE_PATH'),
  mongoUri: readEnv('MONGODB_URI'),
  kafka: {
    clientId: readEnv('KAFKA_CLIENT_ID', 'inventory-service'),
    brokers: toBrokers(readEnv('KAFKA_BROKERS'), 'KAFKA_BROKERS'),
    groupId: readEnv('KAFKA_GROUP_ID', 'inventory-service-group'),
    fromBeginning: toBoolean(readEnv('KAFKA_FROM_BEGINNING', 'false')),
    topics: {
      orderEvents: readEnv('ORDER_EVENTS_TOPIC', 'order-events'),
      inventoryEvents: readEnv('INVENTORY_EVENTS_TOPIC', 'inventory-events'),
    },
  },
};
