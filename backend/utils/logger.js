// utils/logger.js

const pino = require('pino');

// Configure Pino logger – can be extended via env vars if needed
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * ILogger abstraction – currently just forwards to Pino methods.
 * Allows future replacement without touching business code.
 */
module.exports = {
  info: (msg, obj) => logger.info(obj, msg),
  warn: (msg, obj) => logger.warn(obj, msg),
  error: (msg, obj) => logger.error(obj, msg),
  debug: (msg, obj) => logger.debug(obj, msg),
};
