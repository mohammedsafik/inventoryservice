# Inventory Service

Node.js inventory service that consumes `ORDER_CREATED` events from Kafka, checks stock in MongoDB, updates inventory, and publishes the result to Kafka.

## Tech Stack

- Node.js with Express
- MongoDB with Mongoose
- Kafka with kafkajs

## Folder Structure

- `controllers/`
- `services/`
- `models/`
- `routes/`
- `kafka/`
- `config/`
- `utils/`

## Event Flow

1. Consume `ORDER_CREATED` messages from `order-events`.
2. Validate the order payload and merge duplicate product lines.
3. Check stock sequentially from the shared `products` collection.
4. If every item is available, reserve stock sequentially.
5. If any reservation fails mid-way, rollback the earlier deductions.
6. Publish either `INVENTORY_RESERVED` or `OUT_OF_STOCK` to `inventory-events`.

## Topics

- Input: `order-events`
- Output: `inventory-events`

## Environment Variables

Copy `.env.example` into `.env` and set the runtime endpoints there. For production, do not rely on localhost values in code.

```env
PORT=4003
NODE_ENV=development
SERVICE_NAME=inventory-service
HEALTH_ROUTE_PATH=/health
MONGODB_URI=mongodb://127.0.0.1:27017/products
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=inventory-service
KAFKA_GROUP_ID=inventory-service-group
KAFKA_FROM_BEGINNING=false
ORDER_EVENTS_TOPIC=order-events
INVENTORY_EVENTS_TOPIC=inventory-events
```

## Run

```bash
npm install
npm run dev
```

Or for production:

```bash
npm install --omit=dev
npm start
```
# inventoryservice
