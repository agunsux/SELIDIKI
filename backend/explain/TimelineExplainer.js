// explain/TimelineExplainer.js
const db = require('../utils/db');
class TimelineExplainer {
  static async explain(entityHash) {
    const r = await db.query('SELECT event_type, COUNT(*) AS cnt, MIN(timestamp) AS first, MAX(timestamp) AS last FROM timeline_events WHERE entity_hash=$1 GROUP BY event_type ORDER BY cnt DESC LIMIT 5', [entityHash]);
    return { total_event_types: r.rows.length, events: r.rows.map(e => ({ type: e.event_type, count: parseInt(e.cnt, 10), first: e.first, last: e.last })) };
  }
}
module.exports = TimelineExplainer;