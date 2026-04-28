const env = require('../config/env');

function getHealth(req, res) {
  res.status(200).json({
    success: true,
    service: env.serviceName,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
};
