// moderation/ModerationQueue.js
// Manages the moderation queue for reports requiring review.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const VerificationWorkflow = require('./VerificationWorkflow');

class ModerationQueue {
  /**
   * Add a report to the moderation queue.
   * @param {Object} params
   * @param {string} params.reportId - Report tracking ID
   * @param {string} params.entityHash - Entity hash
   * @param {string} params.category - Fraud category
   * @param {string} params.priority - 'low' | 'medium' | 'high' | 'critical'
   * @returns {Promise<Object>}
   */
  static async enqueue(params) {
    const record = {
      id: uuidv4(),
      report_id: params.reportId,
      entity_hash: params.entityHash,
      category: params.category,
      status: 'pending',
      priority: params.priority || 'medium',
      created_at: new Date().toISOString(),
    };

    const query = `
      INSERT INTO moderation_queue (id, report_id, entity_hash, category, status, priority, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      record.id, record.report_id, record.entity_hash, record.category,
      record.status, record.priority, record.created_at,
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (err) {
      if (err.code === '42P01' || err.message.includes('does not exist')) {
        await ModerationQueue._ensureTable();
        const result = await db.query(query, values);
        return result.rows[0];
      }
      throw err;
    }
  }

  /**
   * Dequeue the next report for moderation.
   * @param {string} moderatorId - Moderator taking the item
   * @param {string} priorityFilter - Optional priority filter
   * @returns {Promise<Object|null>}
   */
  static async dequeue(moderatorId, priorityFilter = null) {
    let query = `
      UPDATE moderation_queue
      SET status = 'in_review', moderator_id = $1, claimed_at = NOW()
      WHERE id = (
        SELECT id FROM moderation_queue
        WHERE status = 'pending'
    `;
    const values = [moderatorId];

    if (priorityFilter) {
      query += ` AND priority = $2`;
      values.push(priorityFilter);
    }

    query += ` ORDER BY
        CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Update status of a moderation queue item.
   * @param {string} queueId
   * @param {string} newStatus
   * @param {string} moderatorId
   * @param {string} reason
   * @returns {Promise<Object|null>}
   */
  static async updateStatus(queueId, newStatus, moderatorId, reason = '') {
    // Get current status
    const current = await db.query('SELECT status FROM moderation_queue WHERE id = $1', [queueId]);
    if (current.rows.length === 0) return null;

    // Validate transition
    const validation = VerificationWorkflow.validateTransition(current.rows[0].status, newStatus);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const query = `
      UPDATE moderation_queue
      SET status = $1, moderator_id = $2, reason = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const result = await db.query(query, [newStatus, moderatorId, reason, queueId]);
    return result.rows[0] || null;
  }

  /**
   * Get queue statistics.
   * @returns {Promise<Object>}
   */
  static async getStats() {
    const query = `
      SELECT
        status, priority, COUNT(*) AS count
      FROM moderation_queue
      GROUP BY status, priority
      ORDER BY status, priority
    `;
    const result = await db.query(query);

    const stats = { total: 0, pending: 0, in_review: 0, verified: 0, rejected: 0, by_priority: {} };
    for (const row of result.rows) {
      stats.total += parseInt(row.count, 10);
      stats[row.status] = (stats[row.status] || 0) + parseInt(row.count, 10);
      if (!stats.by_priority[row.priority]) stats.by_priority[row.priority] = {};
      stats.by_priority[row.priority][row.status] = parseInt(row.count, 10);
    }
    return stats;
  }

  /**
   * List queue items with filters.
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  static async list(filters = {}) {
    let query = 'SELECT * FROM moderation_queue WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }
    if (filters.priority) {
      query += ` AND priority = $${paramIndex++}`;
      values.push(filters.priority);
    }
    if (filters.moderatorId) {
      query += ` AND moderator_id = $${paramIndex++}`;
      values.push(filters.moderatorId);
    }

    query += ' ORDER BY created_at DESC';
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(filters.limit);
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS moderation_queue (
        id UUID PRIMARY KEY,
        report_id VARCHAR(64) NOT NULL,
        entity_hash VARCHAR(128),
        category VARCHAR(64),
        status VARCHAR(32) DEFAULT 'pending',
        priority VARCHAR(16) DEFAULT 'medium',
        moderator_id VARCHAR(128),
        reason TEXT,
        claimed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_moderation_status ON moderation_queue(status);
      CREATE INDEX IF NOT EXISTS idx_moderation_priority ON moderation_queue(priority);
    `);
  }
}

module.exports = ModerationQueue;