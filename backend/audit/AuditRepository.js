// audit/AuditRepository.js
/**
 * AuditRepository — ARGUS v1.1
 *
 * Responsible for storing and retrieving immutable audit log entries.
 * Each entry has: action, actor, target, metadata, and timestamp.
 * Entries are append-only — never modified once written.
 */

const db = require('../utils/db');

const AUDIT_TABLE = 'audit_logs';

class AuditRepository {
  /**
   * Create the audit_logs table if it doesn't exist.
   */
  static async ensureTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ${AUDIT_TABLE} (
          id SERIAL PRIMARY KEY,
          action VARCHAR(100) NOT NULL,
          actor_type VARCHAR(50) NOT NULL,
          actor_id VARCHAR(255),
          target_type VARCHAR(50),
          target_id VARCHAR(255),
          metadata JSONB DEFAULT '{}',
          ip_address VARCHAR(45),
          user_agent TEXT,
          severity VARCHAR(20) DEFAULT 'info',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      // Index for efficient querying
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_action ON ${AUDIT_TABLE}(action)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_actor ON ${AUDIT_TABLE}(actor_type, actor_id)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_created ON ${AUDIT_TABLE}(created_at DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_target ON ${AUDIT_TABLE}(target_type, target_id)
      `);
    } catch (err) {
      console.error('AuditRepository: Failed to ensure table:', err.message);
    }
  }

  /**
   * Insert a new audit log entry.
   * @param {Object} entry
   * @param {string} entry.action - e.g. "LOOKUP", "REPORT", "MODERATION", "DECISION", "ADMIN_LOGIN", "DATASET_IMPORT"
   * @param {string} entry.actorType - e.g. "user", "admin", "system", "anonymous"
   * @param {string} [entry.actorId] - User hash or admin ID
   * @param {string} [entry.targetType] - e.g. "phone", "account", "report", "dataset"
   * @param {string} [entry.targetId] - Target identifier
   * @param {Object} [entry.metadata] - Additional structured data
   * @param {string} [entry.ipAddress]
   * @param {string} [entry.userAgent]
   * @param {string} [entry.severity] - "info" | "warning" | "error" | "critical"
   * @returns {Promise<Object>} Created entry
   */
  static async insert(entry) {
    const query = `
      INSERT INTO ${AUDIT_TABLE}
        (action, actor_type, actor_id, target_type, target_id, metadata, ip_address, user_agent, severity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      entry.action,
      entry.actorType,
      entry.actorId || null,
      entry.targetType || null,
      entry.targetId || null,
      JSON.stringify(entry.metadata || {}),
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.severity || 'info',
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (err) {
      console.error('AuditRepository: Insert failed:', err.message);
      // Don't throw — audit should never break the main flow
      return null;
    }
  }

  /**
   * Query audit logs with filters.
   * @param {Object} filters
   * @param {string} [filters.action]
   * @param {string} [filters.actorType]
   * @param {string} [filters.actorId]
   * @param {string} [filters.targetType]
   * @param {string} [filters.targetId]
   * @param {string} [filters.severity]
   * @param {Date} [filters.from] - Start date
   * @param {Date} [filters.to] - End date
   * @param {number} [filters.limit=50]
   * @param {number} [filters.offset=0]
   * @returns {Promise<{rows: Object[], total: number}>}
   */
  static async query(filters = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(filters.action);
    }
    if (filters.actorType) {
      conditions.push(`actor_type = $${paramIndex++}`);
      values.push(filters.actorType);
    }
    if (filters.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      values.push(filters.actorId);
    }
    if (filters.targetType) {
      conditions.push(`target_type = $${paramIndex++}`);
      values.push(filters.targetType);
    }
    if (filters.targetId) {
      conditions.push(`target_id = $${paramIndex++}`);
      values.push(filters.targetId);
    }
    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      values.push(filters.severity);
    }
    if (filters.from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.to);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = Math.min(filters.limit || 50, 1000);
    const offset = filters.offset || 0;

    const countQuery = `SELECT COUNT(*) FROM ${AUDIT_TABLE} ${where}`;
    const dataQuery = `
      SELECT * FROM ${AUDIT_TABLE} ${where}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, values),
        db.query(dataQuery, [...values, limit, offset]),
      ]);

      return {
        rows: dataResult.rows,
        total: parseInt(countResult.rows[0]?.count || 0),
        limit,
        offset,
      };
    } catch (err) {
      console.error('AuditRepository: Query failed:', err.message);
      return { rows: [], total: 0, limit, offset };
    }
  }

  /**
   * Get a single audit entry by ID.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async getById(id) {
    try {
      const result = await db.query(`SELECT * FROM ${AUDIT_TABLE} WHERE id = $1`, [id]);
      return result.rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Count audit entries by action type within a time range.
   * @param {string} [since] - ISO date string
   * @returns {Promise<Object>}
   */
  static async countByAction(since) {
    const sinceClause = since ? `WHERE created_at >= '${since}'` : '';
    try {
      const result = await db.query(`
        SELECT action, COUNT(*) as count
        FROM ${AUDIT_TABLE}
        ${sinceClause}
        GROUP BY action
        ORDER BY count DESC
      `);
      return result.rows;
    } catch {
      return [];
    }
  }
}

module.exports = AuditRepository;