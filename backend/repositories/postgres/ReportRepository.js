// repositories/postgres/ReportRepository.js
const db = require('../../utils/db');

class ReportRepository {
  static async insert(reportData) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Ensure target profile exists
      if (reportData.targetType === 'phone') {
        const checkQuery = 'SELECT id, reports_count FROM phone_profiles WHERE phone_hash = $1';
        const { rows } = await client.query(checkQuery, [reportData.targetHash]);
        if (rows.length === 0) {
          const insertQuery = `
            INSERT INTO phone_profiles (phone_hash, risk_score, primary_category, reports_count, last_activity, first_reported, updated_at)
            VALUES ($1, 5, $2, 1, NOW(), NOW(), NOW())
          `;
          await client.query(insertQuery, [reportData.targetHash, reportData.category]);
        } else {
          const updateQuery = `
            UPDATE phone_profiles
            SET reports_count = reports_count + 1,
                last_activity = NOW(),
                updated_at = NOW()
            WHERE phone_hash = $1
          `;
          await client.query(updateQuery, [reportData.targetHash]);
        }
      } else if (reportData.targetType === 'account') {
        const bankCode = (reportData.bankCode || 'UNKNOWN').toUpperCase();
        const checkQuery = 'SELECT id, reports_count FROM bank_account_profiles WHERE account_hash = $1 AND bank_code = $2';
        const { rows } = await client.query(checkQuery, [reportData.targetHash, bankCode]);
        if (rows.length === 0) {
          const insertQuery = `
            INSERT INTO bank_account_profiles (account_hash, bank_code, risk_score, reports_count, last_activity, first_reported, updated_at)
            VALUES ($1, $2, 5, 1, NOW(), NOW(), NOW())
          `;
          await client.query(insertQuery, [reportData.targetHash, bankCode]);
        } else {
          const updateQuery = `
            UPDATE bank_account_profiles
            SET reports_count = reports_count + 1,
                last_activity = NOW(),
                updated_at = NOW()
            WHERE account_hash = $1 AND bank_code = $2
          `;
          await client.query(updateQuery, [reportData.targetHash, bankCode]);
        }
      }

      // 2. Insert report
      const insertReportQuery = `
        INSERT INTO fraud_reports (tracking_id, reporter_hash, target_type, target_hash, category, description, evidence_url, confidence, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `;
      const { rows } = await client.query(insertReportQuery, [
        reportData.trackingId,
        reportData.reporterHash || null,
        reportData.targetType,
        reportData.targetHash,
        reportData.category,
        reportData.description || null,
        reportData.evidenceUrl || null,
        reportData.confidence || 50,
        'pending'
      ]);

      await client.query('COMMIT');
      return reportData;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Postgres ReportRepository.insert error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  static async findTrending({ limit = 10, category }) {
    try {
      let query = `
        SELECT fr.*, (fr.status = 'verified') as verified
        FROM fraud_reports fr
      `;
      const params = [];
      if (category) {
        query += ' WHERE fr.category = $1';
        params.push(category);
      }
      query += ` ORDER BY fr.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const { rows } = await db.query(query, params);
      return rows.map((row) => ({
        id: row.id,
        trackingId: row.tracking_id,
        targetType: row.target_type,
        targetHash: row.target_hash,
        category: row.category,
        description: row.description,
        evidenceUrl: row.evidence_url,
        reporterHash: row.reporter_hash,
        confidence: row.confidence,
        createdAt: row.created_at?.toISOString?.() || row.created_at,
        verified: row.verified,
      }));
    } catch (err) {
      console.error('Postgres ReportRepository.findTrending error:', err);
      return [];
    }
  }

  static async findByTrackingId(trackingId) {
    try {
      const query = 'SELECT * FROM fraud_reports WHERE tracking_id = $1';
      const { rows } = await db.query(query, [trackingId]);
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: row.id, trackingId: row.tracking_id, targetType: row.target_type,
        targetHash: row.target_hash, category: row.category, description: row.description,
        evidenceUrl: row.evidence_url, reporterHash: row.reporter_hash,
        confidence: row.confidence, createdAt: row.created_at?.toISOString?.() || row.created_at,
        verified: row.status === 'verified',
      };
    } catch (err) { console.error('Postgres ReportRepository.findByTrackingId error:', err); throw err; }
  }

  static async search(criteria = {}) {
    try {
      const { targetHash, targetType, category, status, limit = 20, offset = 0 } = criteria;
      let query = 'SELECT * FROM fraud_reports WHERE 1=1';
      const params = []; let p = 1;
      if (targetHash) { query += ` AND target_hash = $${p++}`; params.push(targetHash); }
      if (targetType) { query += ` AND target_type = $${p++}`; params.push(targetType); }
      if (category) { query += ` AND category = $${p++}`; params.push(category); }
      if (status === 'verified') { query += ` AND status = 'verified'`; }
      else if (status === 'pending') { query += ` AND status = 'pending'`; }
      query += ` ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`; params.push(limit, offset);
      const { rows } = await db.query(query, params);
      const countRes = await db.query('SELECT COUNT(*) as total FROM fraud_reports', []);
      const data = rows.map(row => ({
        id: row.id, trackingId: row.tracking_id, targetType: row.target_type,
        targetHash: row.target_hash, category: row.category, description: row.description,
        evidenceUrl: row.evidence_url, reporterHash: row.reporter_hash,
        confidence: row.confidence, createdAt: row.created_at?.toISOString?.() || row.created_at,
        verified: row.status === 'verified',
      }));
      return { data, total: parseInt(countRes.rows[0].total) || 0 };
    } catch (err) { console.error('Postgres ReportRepository.search error:', err); throw err; }
  }

  static async ping() { await db.query('SELECT 1 FROM fraud_reports LIMIT 1'); }

}

module.exports = ReportRepository;
