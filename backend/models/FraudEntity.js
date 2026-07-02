// models/FraudEntity.js

/**
 * Domain model representing a row from fraud_entities.
 * Accepts raw DB row and maps to camelCase properties.
 */
class FraudEntity {
  constructor(row) {
    this.id = row.id;
    this.entityType = row.entity_type; // e.g., 'PHONE'
    this.normalizedValue = row.normalized_value; // stored normalized string
    this.valueHash = row.value_hash;
    this.riskScore = row.risk_score; // base score in DB
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
    // Additional fields can be added later without affecting callers
  }
}

module.exports = FraudEntity;
