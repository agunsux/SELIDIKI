// config/reputationConfig.js

/**
 * Centralized configuration for Reputation Service.
 * All magic numbers, thresholds, and label mappings are defined here
 * to allow easy tuning without code changes.
 */
module.exports = {
  // Recency window in days for recent reporting activity
  RECENT_REPORT_WINDOW_DAYS: 30,

  // Cache TTL in seconds (default 10 minutes)
  CACHE_TTL_SECONDS: 600,

  // Risk calculation weight configuration (percentage points)
  RISK_WEIGHTS: {
    BASE_SCORE: 0.4, // 40% of final score comes from base_score
    REPORT_COUNT: 0.2, // additional points per report count bucket
    UNIQUE_REPORTERS: 0.15,
    RECENT_REPORTS: 0.1,
    TRUSTED_REPORTER_BONUS: 0.1,
    FALSE_REPORT_PENALTY: -0.05, // negative weight reduces score
  },

  // Confidence calculation weights (similar to risk but for confidence)
  CONFIDENCE_WEIGHTS: {
    REPORT_COUNT: 0.3,
    UNIQUE_REPORTERS: 0.2,
    TRUSTED_REPORTERS: 0.2,
    REPORT_AGE: 0.2,
    CONFLICT_RATIO: -0.1,
  },

  // Mapping of risk score to human‑readable label
  LABEL_MAPPING: [
    { max: 20, label: "AMAN" },
    { max: 40, label: "RISIKO RENDAH" },
    { max: 60, label: "PERLU HATI-HATI" },
    { max: 80, label: "BERISIKO" },
    { max: 100, label: "DIDUGA PENIPU" },
  ],

  // Engine version identifier
  ENGINE_VERSION: "1.0.0",

  // API version
  API_VERSION: "v1",
};
