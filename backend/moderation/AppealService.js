// moderation/AppealService.js
// Handles the appeal workflow for rejected reports/evidence.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const VerificationWorkflow = require('./VerificationWorkflow');

class AppealService {
  /**
   * Submit an appeal for a rejected moderation decision.
   * @param {Object} params
   * @param {string} params.queueId - Moderation queue item ID
   * @param {string} params.appellantId - User/appellant ID
   * @param {string} params.reason - Reason for appeal
   * @param {Object} params.additionalEvidence - Additional evidence data
   * @returns {Promise<Object>}
   */
  static async submitAppeal(params) {
    // Validate current status allows appeal
    const current = await db.query(
      'SELECT status FROM moderation_queue WHERE id = $1',
      [params.queueId]
    );
    if (current.rows.length === 0) {
      throw new Error('Queue item not found');
    }

    const validation = VerificationWorkflow.validateTransition(current.rows[0].status, 'appealed');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create appeal record
    const appeal = {
      id: uuidv4(),
      queue_id: params.queueId,
      appellant_id: params.appellantId,
      reason: params.reason,
      additional_evidence: params.additionalEvidence || {},
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const query = `
      INSERT INTO appeals (id, queue_id, appellant_id, reason, additional_evidence, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      appeal.id, appeal.queue_id, appeal.appellant_id, appeal.reason,
      JSON.stringify(appeal.additional_evidence), appeal.status, appeal.created_at,
    ];

    try {
      await db.query(query, values);
    } catch (err) {
      if (err.code === '42P01' || err.message.includes('does not exist')) {
        await AppealService._ensureTable();
        await db.query(query, values);
      } else {
        throw err;
      }
    }

    // Update moderation queue status
    await db.query(
      `UPDATE moderation_queue SET status = 'appealed', updated_at = NOW() WHERE id = $1`,
      [params.queueId]
    );

    return appeal;
  }

  /**
   * Review an appeal (approve or reject).
   * @param {string} appealId
   * @param {string} decision - 'approved' | 'rejected'
   * @param {string} reviewerId
   * @param {string} notes
   * @returns {Promise<Object>}
   */
  static async reviewAppeal(appealId, decision, reviewerId, notes = '') {
    const newStatus = decision === 'approved' ? 'verified' : 'rejected';

    // Update appeal record
    await db.query(
      `UPDATE appeals SET status = $1, reviewer_id = $2, reviewer_notes = $3, reviewed_at = NOW()
       WHERE id = $4`,
      [decision, reviewerId, notes, appealId]
    );

    // Get associated queue item
    const appeal = await db.query('SELECT queue_id FROM appeals WHERE id = $1', [appealId]);
    if (appeal.rows.length > 0) {
      // Update moderation queue
      await db.query(
        `UPDATE moderation_queue SET status = $1, reason = $2, updated_at = NOW() WHERE id = $3`,
        [newStatus, notes, appeal.rows[0].queue_id]
      );
    }

    return { appeal_id: appealId, decision, new_queue_status: newStatus };
  }

  /**
   * Get all appeals for a moderator.
   * @param {string} statusFilter - Optional status filter
   * @returns {Promise<Array>}
   */
  static async getPendingAppeals(statusFilter = 'pending') {
    const query = `
      SELECT a.*, mq.report_id, mq.entity_hash, mq.category
      FROM appeals a
      JOIN moderation_queue mq ON mq.id = a.queue_id
      WHERE a.status = $1
      ORDER BY a.created_at ASC
    `;
    const result = await db.query(query, [statusFilter]);
    return result.rows;
  }

  /**
   * Get appeal stats.
   * @returns {Promise<Object>}
   */
  static async getAppealStats() {
    const result = await db.query(`
      SELECT status, COUNT(*) AS count FROM appeals GROUP BY status
    `);
    const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const row of result.rows) {
      stats.total += parseInt(row.count, 10);
      stats[row.status] = parseInt(row.count, 10);
    }
    return stats;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS appeals (
        id UUID PRIMARY KEY,
        queue_id UUID NOT NULL REFERENCES moderation_queue(id) ON DELETE CASCADE,
        appellant_id VARCHAR(128) NOT NULL,
        reason TEXT NOT NULL,
        additional_evidence JSONB DEFAULT '{}',
        status VARCHAR(32) DEFAULT 'pending',
        reviewer_id VARCHAR(128),
        reviewer_notes TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
      CREATE INDEX IF NOT EXISTS idx_appeals_queue ON appeals(queue_id);
    `);
  }
}

module.exports = AppealService;