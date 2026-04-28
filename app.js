const express = require('express');

const env = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

app.use(express.json());
app.use(env.healthRoutePath, healthRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;

if (require.main === module) {
  require('./server');
}
