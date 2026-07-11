// validation/ValidationDatasetLoader.js
// Loads and parses verified fraud datasets for validation against predictions.

const db = require('../utils/db');
const GroundTruthRepository = require('./GroundTruthRepository');

class ValidationDatasetLoader {
  /**
   * Load a built-in synthetic dataset for testing and calibration.
   * Generates entities with known risk profiles and corresponding ground truth.
   * @param {number} count - Number of sample entities to generate
   * @returns {Promise<Object>} { loaded, entities }
   */
  static async loadSyntheticDataset(count = 100) {
    const categories = ['marketplace_scam', 'fake_investment', 'illegal_loan', 'phishing', 'romance_scam', 'safe'];
    const records = [];

    for (let i = 0; i < count; i++) {
      const isFraud = Math.random() < 0.4;
      const cat = isFraud ? categories[Math.floor(Math.random() * 5)] : 'safe';
      const actualRisk = isFraud ? 40 + Math.floor(Math.random() * 60) : Math.floor(Math.random() * 20);
      records.push({
        entityHash: `val_entity_${i}_${Date.now()}`,
        entityType: 'phone',
        actualRisk,
        actualCategory: cat,
        source: 'synthetic',
        verifiedBy: 'validation_framework',
      });
    }

    return GroundTruthRepository.load(records);
  }

  /**
   * Load the verified fraud dataset from data/verified_fraud_dataset_v1.json if available.
   * @returns {Promise<Object>} { loaded, totalInFile }
   */
  static async loadFromVerifiedDataset() {
    let dataset;
    try {
      dataset = require('../data/verified_fraud_dataset_v1.json');
    } catch (e) {
      return { loaded: 0, totalInFile: 0, error: 'Dataset file not found' };
    }

    const records = [];
    if (Array.isArray(dataset)) {
      for (const item of dataset) {
        records.push({
          entityHash: item.hash || item.phone_hash || item.entity_hash,
          entityType: item.type || item.entity_type || 'phone',
          actualRisk: item.risk_score || item.riskScore || 50,
          actualCategory: item.category || 'verified_fraud',
          source: 'verified_fraud_dataset_v1',
          verifiedBy: 'dataset',
        });
      }
    }

    const result = await GroundTruthRepository.load(records);
    result.totalInFile = dataset.length || records.length;
    return result;
  }

  /**
   * Load predictions from the system's decision_history table for comparison.
   * @param {Object} filters - Optional date range filters
   * @returns {Promise<Array>} Array of { entityHash, predictedRisk, predictedDecision }
   */
  static async loadPredictions(filters = {}) {
    let query = `SELECT entity_hash, score AS predicted_risk, decision AS predicted_decision, timestamp
      FROM decision_history WHERE entity_hash IS NOT NULL`;
    const values = [];
    let p = 1;
    if (filters.startDate) { query += ` AND timestamp >= $${p++}`; values.push(filters.startDate); }
    if (filters.endDate) { query += ` AND timestamp <= $${p++}`; values.push(filters.endDate); }
    query += ' ORDER BY timestamp DESC';
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Load predictions from the risk engine by querying fraud_events.
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  static async loadRiskEnginePredictions(filters = {}) {
    let query = `SELECT hash AS entity_hash, risk_score AS predicted_risk, confidence AS predicted_confidence, timestamp
      FROM fraud_events WHERE event_type = 'report' AND hash IS NOT NULL`;
    const values = [];
    let p = 1;
    if (filters.startDate) { query += ` AND timestamp >= $${p++}`; values.push(filters.startDate); }
    if (filters.endDate) { query += ` AND timestamp <= $${p++}`; values.push(filters.endDate); }
    query += ' ORDER BY timestamp DESC';
    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = ValidationDatasetLoader;