// trust/IdentityVerificationService.js
/**
 * IdentityVerificationService — ARGUS v1.3
 *
 * Manages verified identities: individuals, businesses, government, financial institutions, investigators.
 * Every badge has issuer, issuedAt, expiresAt, verification level, audit trail.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const AuditService = require('../audit/AuditService');

const VERIFICATION_LEVELS = ['basic', 'standard', 'enhanced', 'verified'];
const IDENTITY_TYPES = ['individual', 'business', 'government', 'financial_institution', 'investigator'];

class IdentityVerificationService {
  /**
   * Issue a verified badge to an entity.
   */
  static async issueBadge(params) {
    const { entityHash, entityType, identityType, level, issuerId, metadata } = params;

    if (!IDENTITY_TYPES.includes(identityType)) throw new Error(`Invalid identity type: ${identityType}`);
    if (!VERIFICATION_LEVELS.includes(level)) throw new Error(`Invalid verification level: ${level}`);

    const id = uuidv4();
    const badge = {
      id,
      entity_hash: entityHash,
      entity_type: entityType,
      identity_type: identityType,
      level,
      issuer_id: issuerId,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      metadata: metadata || {},
    };

    const query = `
      INSERT INTO verified_badges (id, entity_hash, entity_type, identity_type, level, issuer_id,
        issued_at, expires_at, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    await db.query(query, [
      badge.id, badge.entity_hash, badge.entity_type, badge.identity_type, badge.level,
      badge.issuer_id, badge.issued_at, badge.expires_at, badge.status, JSON.stringify(badge.metadata),
    ]);

    await AuditService.logModeration({
      action: 'badge_issued',
      moderatorId: issuerId,
      targetType: entityType,
      targetId: entityHash,
      metadata: { badgeId: id, identityType, level },
    });

    return badge;
  }

  /**
   * Get active badge for an entity.
   */
  static async getBadge(entityHash) {
    const result = await db.query(
      `SELECT * FROM verified_badges WHERE entity_hash = $1 AND status = 'active'
       AND expires_at > NOW() ORDER BY level DESC LIMIT 1`,
      [entityHash]
    );
    if (result.rows.length === 0) return null;

    const badge = result.rows[0];
    return {
      id: badge.id,
      entityHash: badge.entity_hash,
      entityType: badge.entity_type,
      identityType: badge.identity_type,
      level: badge.level,
      issuerId: badge.issuer_id,
      issuedAt: badge.issued_at,
      expiresAt: badge.expires_at,
      status: badge.status,
    };
  }

  /**
   * Revoke a badge.
   */
  static async revokeBadge(badgeId, revokedBy, reason) {
    await db.query(
      `UPDATE verified_badges SET status = 'revoked', revoked_by = $1, revoked_reason = $2, revoked_at = NOW()
       WHERE id = $3`,
      [revokedBy, reason, badgeId]
    );
    await AuditService.logModeration({
      action: 'badge_revoked',
      moderatorId: revokedBy,
      targetType: 'badge',
      targetId: badgeId,
      metadata: { reason },
    });
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS verified_badges (
        id UUID PRIMARY KEY, entity_hash VARCHAR(128) NOT NULL,
        entity_type VARCHAR(32), identity_type VARCHAR(32) NOT NULL,
        level VARCHAR(16) NOT NULL, issuer_id VARCHAR(128) NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(16) DEFAULT 'active',
        revoked_by VARCHAR(128), revoked_reason TEXT, revoked_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_badges_entity ON verified_badges(entity_hash);
      CREATE INDEX IF NOT EXISTS idx_badges_status ON verified_badges(status);
    `);
  }
}

module.exports = IdentityVerificationService;