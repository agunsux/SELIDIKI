// observability/StructuredLogger.js
// pino-based structured logger with correlation IDs.

const pino = require('pino');
const path = require('path');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, '../../logs/selidiki.log');

const transport = pino.transport({
  targets: [
    { target: 'pino/file', options: { destination: LOG_FILE, mkdir: true } },
    { target: 'pino/file', options: { destination: 1 } }, // stdout
  ],
});

const baseLogger = pino({ level: LOG_LEVEL, formatters: { level: (label) => ({ level: label }) } }, transport);

class StructuredLogger {
  constructor(context = {}) {
    this.context = context;
  }

  withContext(ctx) {
    return new StructuredLogger({ ...this.context, ...ctx });
  }

  info(msg, data = {}) { baseLogger.info({ ...this.context, ...data }, msg); }
  warn(msg, data = {}) { baseLogger.warn({ ...this.context, ...data }, msg); }
  error(msg, data = {}) { baseLogger.error({ ...this.context, ...data }, msg); }
  debug(msg, data = {}) { baseLogger.debug({ ...this.context, ...data }, msg); }

  child(bindings) { return this.withContext(bindings); }
}

module.exports = new StructuredLogger();