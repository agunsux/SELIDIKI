// controllers/reputationController.js

const { v4: uuidv4 } = require('uuid');
const ReputationService = require('../services/reputationService');
const logger = require('../utils/logger');
const config = require('../config/reputationConfig');

/**
 * POST /api/v1/reputation/check
 */
exports.check = async (req, res, next) => {
  const queryId = req.headers['x-request-id'] || uuidv4();
  const startTime = Date.now();
  try {
    const { entityType, value, bankCode } = req.body;
    const result = await ReputationService.check({ entityType, value, queryId, bankCode });
    const latency = Date.now() - startTime;
    // log lookup
    logger.info('reputation_lookup', {
      queryId,
      entityType,
      latency,
      cacheHit: result.meta.cacheHit,
    });
    
    res.apiSuccess(
      result.data,
      'Pengecekan reputasi berhasil',
      {
        queryId,
        generatedAt: new Date().toISOString(),
        engineVersion: config.ENGINE_VERSION,
        ...result.meta,
      }
    );
  } catch (err) {
    logger.error('reputation_error', { queryId, error: err.message, stack: err.stack });
    res.apiError(err.message, 'Gagal memeriksa reputasi', 500, { queryId });
  }
};

/**
 * GET /api/v1/reputation/health
 */
exports.health = async (req, res) => {
  const dbStatus = ReputationService.checkDatabaseConnection();
  const cacheStatus = ReputationService.checkCacheConnection();
  res.apiSuccess(
    {
      status: 'ok',
      database: dbStatus ? 'connected' : 'error',
      cache: cacheStatus ? 'connected' : 'error',
      engineVersion: config.ENGINE_VERSION,
    },
    'Layanan reputasi sehat'
  );
};
