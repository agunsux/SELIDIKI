// builders/ResponseBuilder.js

const config = require('../config/reputationConfig');

/**
 * Centralized response builder to ensure consistent envelope across the API.
 * All endpoints should return responses via this builder.
 */
class ResponseBuilder {
  /**
   * Build a success envelope.
   * @param {Object} params
   * @param {Object} params.data - payload data
   * @param {Object} params.meta - additional meta (queryId, cacheHit, etc.)
   * @returns {Object}
   */
  static success({ data, meta = {} }) {
    return {
      success: true,
      data,
      meta: {
        apiVersion: config.API_VERSION,
        engineVersion: config.ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Build an error envelope.
   * @param {Object} params
   * @param {string} params.code - error code identifier
   * @param {string} params.message - human readable message
   * @param {Object} [params.meta] - optional meta (queryId, etc.)
   * @returns {Object}
   */
  static error({ code, message, meta = {} }) {
    return {
      success: false,
      error: { code, message },
      meta: {
        apiVersion: config.API_VERSION,
        engineVersion: config.ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
        ...meta,
      },
    };
  }
}

module.exports = ResponseBuilder;
