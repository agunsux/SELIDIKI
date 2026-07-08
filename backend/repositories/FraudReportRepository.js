// repositories/FraudReportRepository.js

const db = require('../utils/db');
const FraudReport = require('../models/FraudReport');

/**
 * Repository for fraud_reports table.
 * Returns an array of FraudReport domain objects.
 */
class FraudReportRepository {
  static async findByEntityId(entityIdOrHash) {
    try {
      const query = `
        SELECT fr.*, u.trusted as trusted, u.id as reporter_id, fr.category as category
        FROM fraud_reports fr
        LEFT JOIN users u ON fr.reporter_hash = u.phone_hash
        WHERE fr.target_hash = $1 
           OR fr.target_hash = (
             SELECT phone_hash FROM phone_profiles WHERE id::text = $1 LIMIT 1
           )
           OR fr.target_hash = (
             SELECT account_hash FROM bank_account_profiles WHERE id::text = $1 LIMIT 1
           )
      `;
      const { rows } = await db.query(query, [entityIdOrHash]);
      return rows.map(row => {
        // Map reporter_user_id and fraud_entity_id for compatibility with the domain model
        return new FraudReport({
          ...row,
          reporter_user_id: row.reporter_id,
          fraud_entity_id: row.target_hash,
          false_positive: row.status === 'rejected',
          source: 'community'
        });
      });
    } catch (err) {
      console.error('FraudReportRepository.findByEntityId error:', err);
      throw err;
    }
  }

  // Simple ping for health check
  static async ping() {
    await db.query('SELECT 1');
  }

  static async findByTrackingId(trackingId) {
    try {
      const query = 'SELECT fr.*, COALESCE(u.trusted, false) as trusted FROM fraud_reports fr LEFT JOIN users u ON fr.reporter_hash = u.phone_hash WHERE fr.tracking_id = $1';
      const { rows } = await db.query(query, [trackingId]);
      if (rows.length === 0) return null;
      const row = rows[0];
      return new FraudReport({ ...row, reporter_user_id: row.reporter_hash || null, fraud_entity_id: row.target_hash, false_positive: row.status === 'rejected', source: 'community' });
    } catch (err) { console.error('FraudReportRepository.findByTrackingId error:', err); throw err; }
  }

  static async search(criteria = {}) {
    try {
      const { targetHash, targetType, category, status, reporterHash, limit = 20, offset = 0 } = criteria;
      let query = 'SELECT fr.*, COALESCE(u.trusted, false) as trusted FROM fraud_reports fr LEFT JOIN users u ON fr.reporter_hash = u.phone_hash WHERE 1=1';
      const params = []; let p = 1;
      if (targetHash) { query += ` AND fr.target_hash = $${p++}`; params.push(targetHash); }
      if (targetType) { query += ` AND fr.target_type = $${p++}`; params.push(targetType); }
      if (category) { query += ` AND fr.category = $${p++}`; params.push(category); }
      if (status === 'verified') { query += ` AND fr.status = 'verified'`; }
      else if (status === 'pending') { query += ` AND fr.status = 'pending'`; }
      if (reporterHash) { query += ` AND fr.reporter_hash = $${p++}`; params.push(reporterHash); }
      query += ` ORDER BY fr.created_at DESC LIMIT $${p++} OFFSET $${p++}`; params.push(limit, offset);
      const { rows } = await db.query(query, params);
      const countRes = await db.query('SELECT COUNT(*) as total FROM fraud_reports', []);
      const data = rows.map(row => new FraudReport({ ...row, reporter_user_id: row.reporter_hash || null, fraud_entity_id: row.target_hash, false_positive: row.status === 'rejected', source: 'community' }));
      return { data, total: parseInt(countRes.rows[0].total) || 0 };
    } catch (err) { console.error('FraudReportRepository.search error:', err); throw err; }
  }

}

module.exports = FraudReportRepository;
