const mongoose = require('mongoose');

const Product = require('../models/Product');
const logger = require('../utils/logger');
const { simulateProcessingDelay } = require('../utils/delay');

function normalizeItems(items) {
  const mergedItems = [];
  const lookup = new Map();

  for (const item of items) {
    const key = String(item.productId);

    if (lookup.has(key)) {
      lookup.get(key).qty += item.qty;
      continue;
    }

    const normalizedItem = {
      productId: key,
      qty: item.qty,
    };

    lookup.set(key, normalizedItem);
    mergedItems.push(normalizedItem);
  }

  return mergedItems;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isValidOrder(orderEvent) {
  if (!orderEvent || orderEvent.event !== 'ORDER_CREATED') {
    return false;
  }

  if (!orderEvent.orderId || !Array.isArray(orderEvent.items) || !orderEvent.items.length) {
    return false;
  }

  return orderEvent.items.every((item) => {
    return (
      item &&
      mongoose.isValidObjectId(item.productId) &&
      isPositiveInteger(item.qty)
    );
  });
}

async function validateStock(items, orderId) {
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId).lean();

    if (!product) {
      logger.warn('Stock validation failed', {
        orderId,
        productId: item.productId,
        reason: 'Product not found',
      });

      return {
        success: false,
      };
    }

    if (product.stock < item.qty) {
      logger.warn('Stock validation failed', {
        orderId,
        productId: item.productId,
        requestedQty: item.qty,
        availableStock: product.stock,
        reason: 'Insufficient stock',
      });

      return {
        success: false,
      };
    }

    validatedItems.push({
      productId: item.productId,
      qty: item.qty,
      productName: product.name,
      currentStock: product.stock,
    });
  }

  logger.info('Stock validated', {
    orderId,
    items: validatedItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      currentStock: item.currentStock,
    })),
  });

  return {
    success: true,
    validatedItems,
  };
}

async function rollbackReservations(reservedItems, orderId) {
  for (const item of reservedItems) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.qty },
    });
  }

  if (reservedItems.length) {
    logger.warn('Stock rollback completed', {
      orderId,
      itemsRolledBack: reservedItems.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    });
  }
}

async function reserveStock(items, orderId) {
  const reservedItems = [];

  for (const item of items) {
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        stock: { $gte: item.qty },
      },
      {
        $inc: { stock: -item.qty },
      },
      {
        new: true,
      }
    );

    if (!updatedProduct) {
      await rollbackReservations(reservedItems, orderId);

      logger.warn('Stock update aborted', {
        orderId,
        productId: item.productId,
        requestedQty: item.qty,
        reason: 'Concurrent stock change detected',
      });

      return false;
    }

    reservedItems.push(item);
    logger.info('Stock updated', {
      orderId,
      productId: item.productId,
      deductedQty: item.qty,
      remainingStock: updatedProduct.stock,
    });
  }

  return true;
}

async function processOrder(orderEvent) {
  const { orderId } = orderEvent;

  if (!isValidOrder(orderEvent)) {
    logger.warn('Skipping invalid order event', {
      orderId: orderEvent && orderEvent.orderId,
      reason: 'Payload validation failed',
    });

    return orderId
      ? {
          event: 'OUT_OF_STOCK',
          orderId,
        }
      : null;
  }

  const normalizedItems = normalizeItems(orderEvent.items);

  logger.info('Order received', {
    orderId,
    itemCount: normalizedItems.length,
  });

  await simulateProcessingDelay();

  const stockValidation = await validateStock(normalizedItems, orderId);

  if (!stockValidation.success) {
    return {
      event: 'OUT_OF_STOCK',
      orderId,
    };
  }

  const stockReserved = await reserveStock(stockValidation.validatedItems, orderId);

  if (!stockReserved) {
    return {
      event: 'OUT_OF_STOCK',
      orderId,
    };
  }

  return {
    event: 'INVENTORY_RESERVED',
    orderId,
  };
}

module.exports = {
  processOrder,
};
