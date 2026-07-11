// incident/EvidenceHistory.js
/**
 * EvidenceHistory — ARGUS v1.2
 *
 * Tracks the history of evidence attached to an entity across all reports.
 * Shows what evidence exists, from which sources, and verification status.
 */

const db = require('../utils/db');

class EvidenceHistory {
  static async getByEntity(entityHash, limit = 50) {
    const result = await db.query(`
      SELECT er.id, er.type, er.value, er.hash, er.confidence, er.source, er.created_at,
             ev.verification_status, ev.reviewed_by, ev.reviewed_at
      FROM evidence_registry er
      LEFT JOIN evidence_items ev ON ev.id::text = er.id
      WHERE er.hash IN (
        SELECT DISTINCT hash FROM fraud_events WHERE hash = $1
      )
      ORDER BY er.created_at DESC LIMIT $2
    `, [entityHash, limit]);
    return result.rows;
  }

  static async getSourceBreakdown(entityHash) {
    const result = await db.query(`
      SELECT source, type, COUNT(*) as count
      FROM evidence_registry WHERE hash IN (
        SELECT DISTINCT hash FROM fraud_events WHERE hash = $1
      )
      GROUP BY source, type ORDER BY count DESC
    `, [entityHash]);
    return result.rows;
  }
}

module.exports = EvidenceHistory;