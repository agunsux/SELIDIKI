// services/reputationService.js

const { v4: uuidv4 } = require('uuid');
const EntityResolver = require('./entityResolver');
const CacheProvider = require('../utils/cacheProvider');
const { fraudEntityRepo, fraudReportRepo, lookupLogRepo } = require('../config/repositoryResolver');
const RiskEngine = require('./riskEngine');
const ResponseBuilder = require('../builders/ResponseBuilder');

const config = require('../config/reputationConfig');
const logger = require('../utils/logger');

const { hashInput, hashPhone, hashAccount } = require('../utils/crypto');

/**
 * ReputationService orchestrates the lookup pipeline.
 * All steps are pure or delegated; no business logic here.
 */
class ReputationService {
  /**
   * Execute a reputation check.
   * @param {Object} param0
   * @param {string} param0.entityType
   * @param {string} param0.value
   * @param {string} param0.queryId
   * @param {string} [param0.bankCode]
   * @returns {Promise<Object>} { data, meta }
   */
  static async check({ entityType, value, queryId, bankCode }) {
    // Resolve normalizer
    const normalizer = EntityResolver.resolve(entityType);
    const normalized = normalizer.normalize(value);

    // Hash normalized values consistently using our crypto helpers
    let hash;
    if (entityType === 'phone') {
      hash = hashPhone(normalized);
    } else if (entityType === 'account') {
      const parts = value.split(':');
      const extractedBank = parts.length > 1 ? parts[0] : (bankCode || 'UNKNOWN');
      const extractedAccount = parts.length > 1 ? parts[1] : value;
      const cleanAccount = extractedAccount.replace(/[^0-9]/g, '');
      hash = hashAccount(cleanAccount, extractedBank);
    } else {
      hash = hashInput(`${entityType}:${normalized}`);
    }

    // Cache lookup
    const cacheKey = `${entityType}:${hash}`;
    const cached = await CacheProvider.get(cacheKey);
    let entityRecord, reports, cacheHit = false;
    if (cached) {
      ({ entityRecord, reports } = cached);
      cacheHit = true;
    } else {
      // Repository fetches
      entityRecord = await fraudEntityRepo.findByHash(hash);
      if (entityRecord) {
        reports = await fraudReportRepo.findByEntityId(entityRecord.id);
        // Store in cache for future lookups
        await CacheProvider.set(cacheKey, { entityRecord, reports }, config.CACHE_TTL_SECONDS);
      } else {
        // No entity found – treat as empty result
        entityRecord = null;
        reports = [];
      }
    }

    // Risk calculation (stateless)
    const riskResult = RiskEngine.calculate({ entityRecord, reports });

    // Build response payload
    const response = ResponseBuilder.build({
      entityType,
      normalized,
      hash,
      entityRecord,
      reports,
      riskResult,
      queryId,
      cacheHit,
    });

    // Log lookup (asynchronous, fire‑and‑forget)
    lookupLogRepo.insert({
      queryId,
      entityType,
      hash,
      cacheHit,
      riskScore: riskResult.riskScore,
    }).catch(err => logger.error('lookup_log_error', { err }));

    return response;
  }

  // Helper to expose DB health (simple ping)
  static async checkDatabaseConnection() {
    try {
      await fraudEntityRepo.ping();
      return true;
    } catch (_) {
      return false;
    }
  }

  static async checkCacheConnection() {
    try {
      await CacheProvider.ping();
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = ReputationService;

