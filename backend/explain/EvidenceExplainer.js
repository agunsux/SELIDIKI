// explain/EvidenceExplainer.js
const db = require('../utils/db');
class EvidenceExplainer {
  static async explain(entityHash) {
    const r = await db.query(`SELECT ev.evidence_type, ev.verification_status, COUNT(*) AS cnt
      FROM evidence_items ev JOIN fraud_events fe ON fe.report_id = ev.report_id
      WHERE fe.hash = $1 GROUP BY ev.evidence_type, ev.verification_status`, [entityHash]);
    return { total: r.rows.reduce((s, x) => s + parseInt(x.cnt, 10), 0), items: r.rows.map(e => ({ type: e.evidence_type, status: e.verification_status, count: parseInt(e.cnt, 10) })) };
  }
}
module.exports = EvidenceExplainer;