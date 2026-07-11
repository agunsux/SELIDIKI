// evidence/EvidenceRepository.js
/**
 * EvidenceRepository — ARGUS v1.2
 *
 * Stores and retrieves all evidence types: phone, bank account, url, domain,
 * telegram, whatsapp, email, social media.
 * Every evidence receives UUID, hash, timestamp, confidence, source.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const EvidenceHasher = require('./EvidenceHasher');

const EVIDENCE_TYPES = ['phone', 'bank_account', 'url', 'domain', 'telegram', 'whatsapp', 'email', 'social_media'];

class EvidenceRepository {
  /**
   * Insert a new evidence record.
   * @param {Object} params
   * @param {string} params.type - One of EVIDENCE_TYPES
   * @param {string} params.value - Raw evidence value
   * @param {number} params.confidence - 0-100
   * @param {string} params.source - e.g. "user_report", "provider:komdigi", "provider:cekRekening"
   * @param {Object} [params.metadata] - Additional data
   * @returns {Promise<Object>}
   */
  static async insert(params) {
    if (!EVIDENCE_TYPES.includes(params.type)) {
      throw new Error(`Invalid evidence type: ${params.type}`);
    }

    const id = uuidv4();
    const evidenceHash = EvidenceHasher.hash(params.type, params.value);

    const query = `
      INSERT INTO evidence_registry (id, type, value, hash, confidence, source, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      id, params.type, params.value, evidenceHash,
      params.confidence ?? 50, params.source || 'unknown',
      JSON.stringify(params.metadata || {}), new Date().toISOString(),
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (err) {
      if (err.code === '42P01' || err.message.includes('does not exist')) {
        await this._ensureTable();
        const result = await db.query(query, values);
        return result.rows[0];
      }
      throw err;
    }
  }

  /**
   * Find evidence by its hash.
   */
  static async findByHash(hash) {
    const result = await db.query('SELECT * FROM evidence_registry WHERE hash = $1 ORDER BY created_at DESC', [hash]);
    return result.rows;
  }

  /**
   * Find evidence by type and value (exact match).
   */
  static async findByValue(type, value) {
    const hash = EvidenceHasher.hash(type, value);
    return this.findByHash(hash);
  }

  /**
   * Get all evidence for a specific entity hash (linked via reports).
   */
  static async findByEntityHash(entityHash, limit = 50) {
    const query = `
      SELECT er.* FROM evidence_registry er
      JOIN fraud_events fe ON fe.report_id = er.source::text
      WHERE fe.hash = $1
      ORDER BY er.created_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [entityHash, limit]);
    return result.rows;
  }

  /**
   * Update confidence for an evidence record.
   */
  static async updateConfidence(id, confidence) {
    const result = await db.query(
      'UPDATE evidence_registry SET confidence = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [confidence, id]
    );
    return result.rows[0];
  }

  /**
   * Count evidence by type.
   */
  static async countByType() {
    const result = await db.query(`
      SELECT type, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM evidence_registry GROUP BY type ORDER BY count DESC
    `);
    return result.rows;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS evidence_registry (
        id UUID PRIMARY KEY,
        type VARCHAR(32) NOT NULL,
        value TEXT NOT NULL,
        hash VARCHAR(128) NOT NULL,
        confidence NUMERIC(5,2) DEFAULT 50,
        source VARCHAR(64) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence_registry(hash);
      CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_registry(type);
      CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence_registry(source);
    `);
  }
}

module.exports = EvidenceRepository;