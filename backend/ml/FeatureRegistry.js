// ml/FeatureRegistry.js
// Production feature registry — every feature is versioned, documented, and validated.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

const DEFAULT_FEATURES = [
  { name: 'lookup_count', version: 1, owner: 'system', description: 'Total lookups for entity', source: 'lookup_events', featureType: 'counter', validMin: 0, validMax: 100000 },
  { name: 'trust_score', version: 1, owner: 'system', description: 'Community trust score 0-100', source: 'trust_engine', featureType: 'score', validMin: 0, validMax: 100 },
  { name: 'velocity_score', version: 1, owner: 'system', description: 'Velocity detection score 0-100', source: 'velocity_engine', featureType: 'score', validMin: 0, validMax: 100 },
  { name: 'graph_degree', version: 1, owner: 'system', description: 'Number of connected nodes in graph', source: 'graph_engine', featureType: 'counter', validMin: 0, validMax: 10000 },
  { name: 'evidence_count', version: 1, owner: 'system', description: 'Number of evidence items', source: 'evidence_items', featureType: 'counter', validMin: 0, validMax: 1000 },
  { name: 'timeline_count', version: 1, owner: 'system', description: 'Total timeline events', source: 'timeline_events', featureType: 'counter', validMin: 0, validMax: 100000 },
  { name: 'reporter_count', version: 1, owner: 'system', description: 'Unique reporters for entity', source: 'fraud_events', featureType: 'counter', validMin: 0, validMax: 10000 },
  { name: 'risk_score_avg', version: 1, owner: 'system', description: 'Average risk score across events', source: 'fraud_events', featureType: 'score', validMin: 0, validMax: 100 },
  { name: 'confidence_avg', version: 1, owner: 'system', description: 'Average confidence score', source: 'fraud_events', featureType: 'score', validMin: 0, validMax: 100 },
  { name: 'decision_count', version: 1, owner: 'system', description: 'Total decisions for entity', source: 'decision_history', featureType: 'counter', validMin: 0, validMax: 100000 },
];

class FeatureRegistry {
  static async ensureTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS feature_registry (
      id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL, version INT DEFAULT 1,
      owner VARCHAR(128), description TEXT, source VARCHAR(128),
      feature_type VARCHAR(32), valid_min NUMERIC, valid_max NUMERIC,
      created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_name_version ON feature_registry(name, version);`);
  }

  static async register(feature) {
    await FeatureRegistry.ensureTable();
    const id = uuidv4();
    await db.query(`INSERT INTO feature_registry (id, name, version, owner, description, source, feature_type, valid_min, valid_max)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (name, version) DO NOTHING`,
      [id, feature.name, feature.version||1, feature.owner||'system', feature.description||'', feature.source||'', feature.featureType||'unknown', feature.validMin, feature.validMax]);
    return id;
  }

  static async get(name, version) {
    const q = version ? 'SELECT * FROM feature_registry WHERE name=$1 AND version=$2' : 'SELECT * FROM feature_registry WHERE name=$1 ORDER BY version DESC LIMIT 1';
    const v = version ? [name, version] : [name];
    const r = await db.query(q, v);
    return r.rows[0] || null;
  }

  static async list() {
    const r = await db.query('SELECT * FROM feature_registry ORDER BY name, version DESC');
    return r.rows;
  }

  static async listVersions(name) {
    const r = await db.query('SELECT * FROM feature_registry WHERE name=$1 ORDER BY version DESC', [name]);
    return r.rows;
  }

  static async seedDefaults() {
    await FeatureRegistry.ensureTable();
    for (const f of DEFAULT_FEATURES) await FeatureRegistry.register(f);
  }
}

module.exports = FeatureRegistry;