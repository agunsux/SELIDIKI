// repositories/FraudEntityRepository.js

const db = require('../utils/db'); // assume existing pg pool wrapper
const FraudEntity = require('../models/FraudEntity');

/**
 * Repository for fraud_entities table.
 * No business logic – only persistence.
 */
class FraudEntityRepository {
  static async findByHash(hash) {
    const query = 'SELECT * FROM fraud_entities WHERE value_hash = $1';
    const { rows } = await db.query(query, [hash]);
    if (rows.length === 0) return null;
    return new FraudEntity(rows[0]);
  }

  // Simple ping for health check
  static async ping() {
    await db.query('SELECT 1');
  }
}

module.exports = FraudEntityRepository;
