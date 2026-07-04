// utils/dbComparer.js
const logger = require('./logger');

/**
 * Compare results returned by Firestore and PostgreSQL to flag data schema drifts.
 */
function compareObjects(operation, firestoreResult, postgresResult) {
  try {
    if (!firestoreResult && !postgresResult) return;
    
    if (!firestoreResult || !postgresResult) {
      logger.warn(`[MIGRATION_PARITY_DIFF] ${operation}: Existence mismatch. Firestore exists: ${!!firestoreResult}, Postgres exists: ${!!postgresResult}`, {
        operation,
        firestoreExists: !!firestoreResult,
        postgresExists: !!postgresResult,
      });
      return;
    }

    const diffs = {};
    const fieldsToCompare = [
      'riskScore',
      'reportsCount',
      'isBlocked',
      'isConfirmedFraud',
      'category'
    ];

    fieldsToCompare.forEach((field) => {
      if (firestoreResult[field] !== postgresResult[field]) {
        // Safe check for equivalent empty values (null vs undefined)
        if (!firestoreResult[field] && !postgresResult[field]) return;
        diffs[field] = {
          firestore: firestoreResult[field],
          postgres: postgresResult[field]
        };
      }
    });

    if (Object.keys(diffs).length > 0) {
      logger.warn(`[MIGRATION_PARITY_DIFF] ${operation}: Values discrepancy detected`, {
        operation,
        diffs,
        firestoreResult,
        postgresResult
      });
    }
  } catch (err) {
    logger.error(`[MIGRATION_PARITY_DIFF] ${operation}: Comparison calculation crashed`, { err: err.message });
  }
}

module.exports = { compareObjects };
