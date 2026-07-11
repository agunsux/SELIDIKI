// marketplace/EvidenceExchange.js
/**
 * EvidenceExchange — ARGUS v1.3
 *
 * Marketplace for contributed evidence with provenance, revocation, revalidation.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const EvidenceHasher = require('../evidence/EvidenceHasher');

class EvidenceExchange {
  static async contribute(params) {
    const { type, value, contributorId, confidence, source } = params;
    const hash = EvidenceHasher.hash(type, value);
    const id = uuidv4();

    await db.query(`
      INSERT INTO contributed_evidence (id, type, value, hash, contributor_id, confidence, source, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active',NOW())
    `, [id, type, value, hash, contributorId, confidence || 50, source || 'marketplace']);
    return { id, hash };
  }

  static async revoke(evidenceId, revokedBy) {
    await db.query(
      "UPDATE contributed_evidence SET status = 'revoked', revoked_by = $1, revoked_at = NOW() WHERE id = $2",
      [revokedBy, evidenceId]
    );
  }

  static async getByHash(hash) {
    const result = await db.query(
      "SELECT * FROM contributed_evidence WHERE hash = $1 AND status = 'active' ORDER BY created_at DESC", [hash]
    );
    return result.rows;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS contributed_evidence (
        id UUID PRIMARY KEY, type VARCHAR(32) NOT NULL, value TEXT NOT NULL,
        hash VARCHAR(128) NOT NULL, contributor_id VARCHAR(128) NOT NULL,
        confidence NUMERIC(5,2) DEFAULT 50, source VARCHAR(64),
        status VARCHAR(16) DEFAULT 'active',
        revoked_by VARCHAR(128), revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ce_hash ON contributed_evidence(hash);
      CREATE INDEX IF NOT EXISTS idx_ce_contributor ON contributed_evidence(contributor_id);
    `);
  }
}

class RewardEngine {
  static async calculate(contributorId) {
    const result = await db.query(`
      SELECT COUNT(*) as total, AVG(confidence) as avg_conf,
             COUNT(*) FILTER (WHERE status = 'active') as active
      FROM contributed_evidence WHERE contributor_id = $1
    `, [contributorId]);
    const r = result.rows[0];
    const total = parseInt(r.total || 0);
    return { total, active: parseInt(r.active || 0), avgConfidence: parseFloat(r.avg_conf || 0), score: total * 10 + (r.avg_conf || 0) };
  }
}

class ContributionLedger {
  static async log(params) {
    const { contributorId, action, evidenceId, reward } = params;
    await db.query(
      `INSERT INTO contribution_ledger (id, contributor_id, action, evidence_id, reward, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
      [contributorId, action, evidenceId, reward || 0]
    );
  }

  static async getBalance(contributorId) {
    const result = await db.query(
      'SELECT COALESCE(SUM(reward), 0) as balance FROM contribution_ledger WHERE contributor_id = $1',
      [contributorId]
    );
    return { balance: parseInt(result.rows[0]?.balance || 0) };
  }
}

module.exports = { EvidenceExchange, RewardEngine, ContributionLedger };