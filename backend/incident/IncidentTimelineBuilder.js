// incident/IncidentTimelineBuilder.js
/**
 * IncidentTimelineBuilder — ARGUS v1.2
 *
 * Builds a chronological investigation timeline for any entity.
 * Combines data from: reports, lookups, verifications, community actions, evidence, risk changes.
 */

const db = require('../utils/db');

class IncidentTimelineBuilder {
  /**
   * Build full investigation timeline for an entity.
   * @param {string} entityHash
   * @returns {Promise<{timeline: Object[], summary: Object}>}
   */
  static async build(entityHash) {
    const events = [];

    // 1. Lookup events
    try {
      const lookups = await db.query(
        `SELECT 'lookup' as source, id, timestamp, risk_score, confidence,
                jsonb_build_object('provider', provider, 'response_time_ms', response_time_ms) as metadata
         FROM lookup_events WHERE hash = $1`, [entityHash]
      );
      for (const r of lookups.rows) events.push({ ...r, eventType: 'lookup' });
    } catch {}

    // 2. Report events
    try {
      const reports = await db.query(
        `SELECT 'report' as source, id, timestamp, risk_score, confidence,
                jsonb_build_object('category', category, 'reporter_hash', reporter_hash) as metadata
         FROM fraud_events WHERE hash = $1 AND event_type = 'report'`, [entityHash]
      );
      for (const r of reports.rows) events.push({ ...r, eventType: 'report' });
    } catch {}

    // 3. Verification events
    try {
      const verifications = await db.query(
        `SELECT 'verification' as source, ev.id, ev.updated_at as timestamp,
                jsonb_build_object('status', ev.verification_status, 'reviewed_by', ev.reviewed_by) as metadata
         FROM evidence_items ev JOIN fraud_events fe ON fe.report_id = ev.report_id
         WHERE fe.hash = $1 AND ev.verification_status IN ('verified', 'rejected')`, [entityHash]
      );
      for (const r of verifications.rows) events.push({ ...r, eventType: 'verification' });
    } catch {}

    // 4. Community actions
    try {
      const community = await db.query(
        `SELECT 'community' as source, id, created_at as timestamp,
                jsonb_build_object('action', action, 'actor', actor_hash, 'reason', reason) as metadata
         FROM community_actions WHERE entity_hash = $1`, [entityHash]
      );
      for (const r of community.rows) events.push({ ...r, eventType: `community_${r.metadata?.action || 'action'}` });
    } catch {}

    // 5. Moderation events
    try {
      const mods = await db.query(
        `SELECT 'moderation' as source, id, updated_at as timestamp,
                jsonb_build_object('status', status, 'moderator', moderator_id, 'reason', reason) as metadata
         FROM moderation_queue WHERE entity_hash = $1 AND status != 'pending'`, [entityHash]
      );
      for (const r of mods.rows) events.push({ ...r, eventType: 'moderation' });
    } catch {}

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

    const summary = {
      totalEvents: events.length,
      firstEvent: events[0]?.timestamp || null,
      lastEvent: events[events.length - 1]?.timestamp || null,
      duration: events.length > 1
        ? Math.round((new Date(events[events.length - 1].timestamp) - new Date(events[0].timestamp)) / 86400000) + ' days'
        : 'single event',
      byType: events.reduce((acc, e) => { acc[e.eventType] = (acc[e.eventType] || 0) + 1; return acc; }, {}),
    };

    return { timeline: events, summary };
  }

  static async buildForMultiple(entityHashes) {
    const results = {};
    for (const hash of entityHashes) {
      results[hash] = await this.build(hash);
    }
    return results;
  }
}

module.exports = IncidentTimelineBuilder;