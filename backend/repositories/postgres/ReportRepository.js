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
}

module.exports = ReportRepository;
