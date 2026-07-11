// explain/ExplanationEngine.js
// Orchestrator: produces human, technical, and JSON explanations for any decision.

const db = require('../utils/db');

class ExplanationEngine {
  static async explain(entityHash, signals = {}) {
    const [human, technical, json] = await Promise.all([
      ExplanationEngine._humanExplanation(entityHash, signals),
      ExplanationEngine._technicalExplanation(entityHash, signals),
      ExplanationEngine._jsonExplanation(entityHash, signals),
    ]);
    return { human, technical, json };
  }

  static async _humanExplanation(entityHash, signals) {
    const parts = [];
    if (signals.riskScore >= 60) parts.push(`Risiko tinggi (${signals.riskScore}/100) terdeteksi untuk entitas ini`);
    else if (signals.riskScore >= 35) parts.push(`Risiko menengah (${signals.riskScore}/100)`);
    else parts.push(`Risiko rendah (${signals.riskScore}/100)`);

    if (signals.ruleCount > 0) parts.push(`${signals.ruleCount} aturan keamanan terpicu`);
    if (signals.velocityScore >= 55) parts.push(`Aktivitas mencurigakan: ${signals.velocityScore}/100`);

    const reports = await db.query('SELECT COUNT(*) AS cnt FROM fraud_events WHERE hash = $1 AND event_type = $2', [entityHash, 'report']);
    const reportCount = parseInt(reports.rows[0]?.cnt || 0);
    if (reportCount > 0) parts.push(`${reportCount} laporan penipuan terkait entitas ini`);

    const edges = await db.query('SELECT COUNT(*) AS cnt FROM graph_edges WHERE source_id = $1 OR target_id = $1', [entityHash]);
    const edgeCount = parseInt(edges.rows[0]?.cnt || 0);
    if (edgeCount > 0) parts.push(`Memiliki ${edgeCount} koneksi dalam graf penipuan`);

    return parts.length > 0
      ? parts.join('. ') + '.'
      : 'Tidak ada data mencurigakan yang ditemukan untuk entitas ini.';
  }

  static async _technicalExplanation(entityHash, signals) {
    const data = {};
    try {
      const [reports, decisions, edges] = await Promise.all([
        db.query('SELECT COUNT(*) AS cnt FROM fraud_events WHERE hash = $1', [entityHash]),
        db.query('SELECT decision, COUNT(*) AS cnt FROM decision_history WHERE entity_hash = $1 GROUP BY decision', [entityHash]),
        db.query('SELECT relationship, COUNT(*) AS cnt FROM graph_edges WHERE source_id = $1 OR target_id = $1 GROUP BY relationship', [entityHash]),
      ]);
      data.reportCount = parseInt(reports.rows[0]?.cnt || 0);
      data.decisions = decisions.rows;
      data.relationships = edges.rows.map(e => ({ type: e.relationship, count: parseInt(e.cnt, 10) }));
    } catch (e) { data.error = e.message; }

    return {
      entity_hash: entityHash,
      risk_score: signals.riskScore || 0,
      confidence: signals.confidence || 0,
      velocity_score: signals.velocityScore || 0,
      trust_score: signals.trustScore || 0,
      rules_triggered: signals.ruleCount || 0,
      report_count: data.reportCount || 0,
      decisions: data.decisions || [],
      graph_relationships: data.relationships || [],
    };
  }

  static async _jsonExplanation(entityHash, signals) {
    const technical = await ExplanationEngine._technicalExplanation(entityHash, signals);
    return {
      entity: entityHash,
      timestamp: new Date().toISOString(),
      score_summary: {
        risk: technical.risk_score,
        confidence: technical.confidence,
        velocity: technical.velocity_score,
        trust: technical.trust_score,
      },
      evidence: {
        reports: technical.report_count,
        rules: technical.rules_triggered,
        decisions: technical.decisions,
        graph: technical.graph_relationships,
      },
    };
  }
}

module.exports = ExplanationEngine;