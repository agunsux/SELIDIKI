// repositories/lookupLogRepository.js
const db = require('../utils/db');

/**
 * Repository for logging reputation lookup events.
 * No business logic, purely persistence.
 */
class LookupLogRepository {
  static async insert({ queryId, entityType, hash, cacheHit, riskScore }) {
    const query = `
      INSERT INTO audit_log (action, target_id, target_type, metadata)
      VALUES ($1, $2, $3, $4)
    `;
    const metadata = {
      queryId,
      cacheHit,
      riskScore
    };
    return db.query(query, ['REPUTATION_CHECK', hash, entityType, JSON.stringify(metadata)]);
  }
}

module.exports = LookupLogRepository;
