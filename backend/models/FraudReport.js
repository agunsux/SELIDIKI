// models/FraudReport.js

/**
 * Domain model for rows from fraud_reports.
 * Maps DB snake_case columns to camelCase properties.
 */
class FraudReport {
  constructor(row) {
    this.id = row.id;
    this.fraudEntityId = row.fraud_entity_id;
    this.reporterId = row.reporter_user_id;
    this.trusted = row.trusted || false; // joined from users.trusted
    this.falsePositive = row.false_positive || false;
    this.source = row.source; // e.g., 'community'
    this.category = row.category; // optional string
    this.confidence = row.confidence; // numeric confidence of report
    this.createdAt = row.created_at;
    // any additional fields can be added later
  }
}

module.exports = FraudReport;
