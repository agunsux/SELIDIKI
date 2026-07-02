// controllers/reputationController.js

const { v4: uuidv4 } = require('uuid');
const ReputationService = require('../services/reputationService');
const logger = require('../utils/logger');
const config = require('../config/reputationConfig');

/**
 * POST /api/v1/reputation/check
 */
exports.check = async (req, res, next) => {
  const queryId = uuidv4();
  const startTime = Date.now();
  try {
    const { entityType, value } = req.body;
    const result = await ReputationService.check({ entityType, value, queryId });
    const latency = Date.now() - startTime;
    // log lookup
    logger.info('reputation_lookup', {
      queryId,
      entityType,
      latency,
      cacheHit: result.meta.cacheHit,
    });
    res.json({
      success: true,
      data: result.data,
      meta: {
        queryId,
        generatedAt: new Date().toISOString(),
        engineVersion: config.ENGINE_VERSION,
        ...result.meta,
      },
    });
  } catch (err) {
    logger.error('reputation_error', { queryId, error: err.message, stack: err.stack });
    next(err);
  }
};

/**
 * GET /api/v1/reputation/health
 */
exports.health = async (req, res) => {
  const dbStatus = ReputationService.checkDatabaseConnection();
  const cacheStatus = ReputationService.checkCacheConnection();
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: dbStatus ? 'connected' : 'error',
      cache: cacheStatus ? 'connected' : 'error',
      engineVersion: config.ENGINE_VERSION,
    },
  });
};
