// community/CommunityReportService.js
/**
 * CommunityReportService — ARGUS v1.2
 *
 * Handles community-driven reports with support for report, confirm, deny, appeal, and moderation.
 * Every action updates trust, confidence, and reputation.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const AuditService = require('../audit/AuditService');

const REPORT_ACTIONS = ['report', 'confirm', 'deny', 'appeal'];

class CommunityReportService {
  /**
   * Submit a community action on an entity.
   */
  static async submitAction(params) {
    const { action, entityHash, entityType, actorHash, reason, confidence } = params;

    if (!REPORT_ACTIONS.includes(action)) {
      throw new Error(`Invalid action: ${action}. Valid: ${REPORT_ACTIONS.join(', ')}`);
    }

    const id = uuidv4();

    const query = `
      INSERT INTO community_actions (id, action, entity_hash, entity_type, actor_hash, reason, confidence, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [id, action, entityHash, entityType || 'unknown', actorHash, reason || '', confidence || 50, new Date().toISOString()];

    try {
      const result = await db.query(query, values);
      await AuditService.logModeration({
        action: `community_${action}`,
        moderatorId: actorHash,
        targetType: entityType,
        targetId: entityHash,
        metadata: { reason, confidence },
      });
      return result.rows[0];
    } catch (err) {
      if (err.code === '42P01') {
        await this._ensureTable();
        const result = await db.query(query, values);
        return result.rows[0];
      }
      throw err;
    }
  }

  /**
   * Get all community actions for an entity.
   */
  static async getActions(entityHash, limit = 50) {
    const result = await db.query(
      'SELECT * FROM community_actions WHERE entity_hash = $1 ORDER BY created_at DESC LIMIT $2',
      [entityHash, limit]
    );
    return result.rows;
  }

  /**
   * Get action counts for an entity (report/confirm/deny).
   */
  static async getActionCounts(entityHash) {
    const result = await db.query(`
      SELECT action, COUNT(*) as count FROM community_actions
      WHERE entity_hash = $1 GROUP BY action
    `, [entityHash]);
    const counts = { report: 0, confirm: 0, deny: 0, appeal: 0 };
    for (const row of result.rows) {
      counts[row.action] = parseInt(row.count, 10);
    }
    return counts;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS community_actions (
        id UUID PRIMARY KEY,
        action VARCHAR(16) NOT NULL,
        entity_hash VARCHAR(128) NOT NULL,
        entity_type VARCHAR(32) DEFAULT 'unknown',
        actor_hash VARCHAR(128),
        reason TEXT,
        confidence NUMERIC(5,2) DEFAULT 50,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_community_entity ON community_actions(entity_hash);
      CREATE INDEX IF NOT EXISTS idx_community_actor ON community_actions(actor_hash);
      CREATE INDEX IF NOT EXISTS idx_community_action ON community_actions(action);
    `);
  }
}

module.exports = CommunityReportService;