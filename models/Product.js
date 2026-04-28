const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'products',
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Product || mongoose.model('Product', productSchema);
