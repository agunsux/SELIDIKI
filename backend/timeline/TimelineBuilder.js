// timeline/TimelineBuilder.js
// Builds and materializes timeline events from all data sources into a unified chronological view.
// Supports event types: LOOKUP, REPORT, VERIFICATION, MODERATION, APPEAL, RISK_CHANGE, TRUST_CHANGE, VELOCITY_ALERT, GRAPH_UPDATE

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

const TIMELINE_EVENT_TYPES = [
  'LOOKUP', 'REPORT', 'VERIFICATION', 'MODERATION', 'APPEAL',
  'RISK_CHANGE', 'TRUST_CHANGE', 'VELOCITY_ALERT', 'GRAPH_UPDATE',
];

class TimelineBuilder {
  /**
   * Append a timeline event (immutable).
   * @param {Object} params
   * @param {string} params.entityType - 'phone'|'bank'|'domain'|'case'|'reporter'
   * @param {string} params.entityHash - Entity identifier
   * @param {string} params.eventType - One of TIMELINE_EVENT_TYPES
   * @param {string} params.sourceId - Original event/report/lookup ID
   * @param {Object} params.metadata - Event-specific data payload
   * @param {number} params.riskScore - Risk score at time of event
   * @param {number} params.confidence - Confidence at time of event
   * @returns {Promise<Object>} The stored timeline entry
   */
  static async append(params) {
    if (!TIMELINE_EVENT_TYPES.includes(params.eventType)) {
      throw new Error(`Invalid timeline event type: ${params.eventType}. Valid: ${TIMELINE_EVENT_TYPES.join(', ')}`);
    }

    const entry = {
      id: uuidv4(),
      entity_type: params.entityType,
      entity_hash: params.entityHash,
      event_type: params.eventType,
      source_id: params.sourceId || null,
      metadata: params.metadata || {},
      risk_score: params.riskScore != null ? params.riskScore : null,
      confidence: params.confidence != null ? params.confidence : null,
      timestamp: new Date().toISOString(),
    };

    const query = `
      INSERT INTO timeline_events (id, entity_type, entity_hash, event_type, source_id,
        metadata, risk_score, confidence, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [
      entry.id, entry.entity_type, entry.entity_hash, entry.event_type,
      entry.source_id, JSON.stringify(entry.metadata), entry.risk_score,
      entry.confidence, entry.timestamp,
    ];

    try {
      await db.query(query, values);
    } catch (err) {
      if (err.code === '42P01' || err.message.includes('does not exist')) {
        await TimelineBuilder._ensureTable();
        await db.query(query, values);
      } else {
        throw err;
      }
    }

    return entry;
  }

  /**
   * Batch append multiple timeline events.
   * @param {Array<Object>} entries
   * @returns {Promise<Array>}
   */
  static async batchAppend(entries) {
    if (entries.length === 0) return [];
    const inserted = [];

    for (const entry of entries) {
      const result = await TimelineBuilder.append(entry);
      inserted.push(result);
    }

    return inserted;
  }

  /**
   * Build timeline from existing data sources for a given entity.
   * Queries fraud_events, lookup_events, moderation_queue, and graph changes.
   * @param {string} entityHash
   * @returns {Promise<Array>} Timeline entries
   */
  static async buildFromSources(entityHash) {
    const entries = [];

    // 1. Lookup events
    const lookups = await db.query(
      "SELECT id AS source_id, 'LOOKUP' AS event_type, risk_score, confidence, timestamp, " +
      "'{}'::jsonb AS metadata FROM lookup_events WHERE hash = $1",
      [entityHash]
    );
    for (const row of lookups.rows) {
      entries.push(row);
    }

    // 2. Fraud report events
    const reports = await db.query(
      `SELECT id AS source_id, 'REPORT' AS event_type, risk_score, confidence, timestamp,
              jsonb_build_object('category', category, 'reporter_hash', reporter_hash) AS metadata
       FROM fraud_events WHERE hash = $1 AND event_type = 'report'`,
      [entityHash]
    );
    for (const row of reports.rows) {
      entries.push(row);
    }

    // 3. Verification events
    const verifications = await db.query(
      `SELECT ev.id AS source_id, 'VERIFICATION' AS event_type, fe.risk_score, NULL AS confidence,
              ev.updated_at AS timestamp,
              jsonb_build_object('verification_status', ev.verification_status, 'reviewed_by', ev.reviewed_by) AS metadata
       FROM evidence_items ev
       JOIN fraud_events fe ON fe.report_id = ev.report_id AND fe.hash = $1
       WHERE ev.verification_status IN ('verified', 'rejected')`,
      [entityHash]
    );
    for (const row of verifications.rows) {
      entries.push(row);
    }

    // 4. Moderation events
    const moderations = await db.query(
      `SELECT id AS source_id, 'MODERATION' AS event_type, NULL AS risk_score, NULL AS confidence,
              updated_at AS timestamp,
              jsonb_build_object('status', status, 'moderator', moderator_id, 'reason', reason) AS metadata
       FROM moderation_queue WHERE entity_hash = $1 AND status != 'pending'`,
      [entityHash]
    );
    for (const row of moderations.rows) {
      entries.push(row);
    }

    // Sort by timestamp ascending
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return entries;
  }

  /**
   * Populate the timeline_events table by replaying all source data.
   * @returns {Promise<number>} Count of entries created
   */
  static async populateAll() {
    let count = 0;

    // Clear existing timeline data
    await db.query('TRUNCATE timeline_events');

    // Populate from fraud_events
    const fraudEvents = await db.query(
      `SELECT id AS source_id,
              CASE WHEN event_type = 'report' THEN 'REPORT' ELSE 'VERIFICATION' END AS event_type,
              hash, risk_score, confidence, timestamp,
              jsonb_build_object('category', category, 'reporter_hash', reporter_hash, 'event_type', event_type) AS metadata
       FROM fraud_events`
    );
    for (const row of fraudEvents.rows) {
      if (!row.hash) continue;
      await TimelineBuilder.append({
        entityType: 'phone',
        entityHash: row.hash,
        eventType: row.event_type,
        sourceId: row.source_id,
        metadata: row.metadata,
        riskScore: row.risk_score,
        confidence: row.confidence,
      });
      count++;
    }

    // Populate from lookup_events
    const lookupEvents = await db.query(
      `SELECT id AS source_id, hash, risk_score, confidence, timestamp,
              jsonb_build_object('entity_type', entity_type, 'provider', provider, 'response_time_ms', response_time_ms) AS metadata
       FROM lookup_events`
    );
    for (const row of lookupEvents.rows) {
      if (!row.hash) continue;
      await TimelineBuilder.append({
        entityType: 'phone',
        entityHash: row.hash,
        eventType: 'LOOKUP',
        sourceId: row.source_id,
        metadata: row.metadata,
        riskScore: row.risk_score,
        confidence: row.confidence,
      });
      count++;
    }

    // Populate from moderation_queue
    const modEvents = await db.query(
      `SELECT id AS source_id, entity_hash, status, moderator_id, reason, updated_at
       FROM moderation_queue WHERE status != 'pending'`
    );
    for (const row of modEvents.rows) {
      if (!row.entity_hash) continue;
      await TimelineBuilder.append({
        entityType: 'phone',
        entityHash: row.entity_hash,
        eventType: 'MODERATION',
        sourceId: row.source_id,
        metadata: { status: row.status, moderator: row.moderator_id, reason: row.reason },
        riskScore: null,
        confidence: null,
      });
      count++;
    }

    return count;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS timeline_events (
        id UUID PRIMARY KEY,
        entity_type VARCHAR(32) NOT NULL,
        entity_hash VARCHAR(255) NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        source_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        risk_score NUMERIC(5,2),
        confidence NUMERIC(5,2),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_timeline_entity ON timeline_events(entity_hash);
      CREATE INDEX IF NOT EXISTS idx_timeline_entity_type ON timeline_events(entity_type, entity_hash);
      CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON timeline_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_timeline_ts ON timeline_events(timestamp);
    `);
  }
}

module.exports = TimelineBuilder;