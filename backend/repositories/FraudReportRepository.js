// repositories/FraudReportRepository.js

const db = require('../utils/db');
const FraudReport = require('../models/FraudReport');

/**
 * Repository for fraud_reports table.
 * Returns an array of FraudReport domain objects.
 */
class FraudReportRepository {
  static async findByEntityId(entityId) {
    const query = `
      SELECT fr.* , u.trusted as trusted, u.id as reporter_id
      FROM fraud_reports fr
      LEFT JOIN users u ON fr.reporter_user_id = u.id
      WHERE fr.fraud_entity_id = $1
    `;
    const { rows } = await db.query(query, [entityId]);
    return rows.map(row => new FraudReport(row));
  }

  // Simple ping for health check
  static async ping() {
    await db.query('SELECT 1');
  }
}

module.exports = FraudReportRepository;
