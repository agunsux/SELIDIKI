// case/CaseService.js
/**
 * CaseService — ARGUS v1.3
 *
 * Full case management platform with workflow:
 * Open → Triaged → Investigating → Waiting Evidence → Resolved → Dismissed → Appealed
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const AuditService = require('../audit/AuditService');

const CASE_STATUSES = ['open', 'triaged', 'investigating', 'waiting_evidence', 'resolved', 'dismissed', 'appealed'];
const VALID_TRANSITIONS = {
  open: ['triaged', 'dismissed'],
  triaged: ['investigating', 'dismissed'],
  investigating: ['waiting_evidence', 'resolved', 'dismissed'],
  waiting_evidence: ['investigating', 'resolved', 'dismissed'],
  resolved: ['appealed'],
  dismissed: ['appealed'],
  appealed: ['open'],
};

class CaseService {
  static async create(params) {
    const { title, description, entityHash, entityType, category, priority, assigneeId, createdBy } = params;
    const id = uuidv4();
    const caseNo = `ARG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const query = `
      INSERT INTO cases (id, case_no, title, description, entity_hash, entity_type, category, priority,
        status, assignee_id, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;
    const result = await db.query(query, [
      id, caseNo, title, description, entityHash, entityType || 'unknown', category, priority || 'medium',
      'open', assigneeId || null, createdBy,
    ]);

    await AuditService.logModeration({
      action: 'case_created', moderatorId: createdBy,
      targetType: 'case', targetId: id,
      metadata: { caseNo, title, category },
    });
    return result.rows[0];
  }

  static async transition(caseId, newStatus, userId, reason) {
    const current = await db.query('SELECT status FROM cases WHERE id = $1', [caseId]);
    if (current.rows.length === 0) throw new Error('Case not found');
    const allowed = VALID_TRANSITIONS[current.rows[0].status] || [];
    if (!allowed.includes(newStatus)) throw new Error(`Invalid transition: ${current.rows[0].status} -> ${newStatus}`);

    await db.query(
      'UPDATE cases SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, caseId]
    );
    await CaseTimeline.append({ caseId, action: `status_${newStatus}`, userId, metadata: { reason } });
    return { caseId, from: current.rows[0].status, to: newStatus };
  }

  static async get(caseId) {
    const result = await db.query('SELECT * FROM cases WHERE id = $1', [caseId]);
    return result.rows[0] || null;
  }

  static async list(filters = {}) {
    let query = 'SELECT * FROM cases WHERE 1=1';
    const values = []; let p = 1;
    if (filters.status) { query += ` AND status = $${p++}`; values.push(filters.status); }
    if (filters.assigneeId) { query += ` AND assignee_id = $${p++}`; values.push(filters.assigneeId); }
    if (filters.entityHash) { query += ` AND entity_hash = $${p++}`; values.push(filters.entityHash); }
    if (filters.category) { query += ` AND category = $${p++}`; values.push(filters.category); }
    query += ' ORDER BY updated_at DESC';
    const result = await db.query(query, values);
    return result.rows;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id UUID PRIMARY KEY, case_no VARCHAR(32) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL, description TEXT,
        entity_hash VARCHAR(128), entity_type VARCHAR(32),
        category VARCHAR(64), priority VARCHAR(16) DEFAULT 'medium',
        status VARCHAR(24) DEFAULT 'open',
        assignee_id VARCHAR(128), created_by VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
      CREATE INDEX IF NOT EXISTS idx_cases_assignee ON cases(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_cases_entity ON cases(entity_hash);
    `);
  }
}

const CaseTimeline = require('./CaseTimeline');
module.exports = CaseService;