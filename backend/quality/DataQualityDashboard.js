// quality/DataQualityDashboard.js
/**
 * DataQualityDashboard — ARGUS v1.2
 *
 * Measures and reports on data quality metrics:
 * duplicates, coverage, freshness, consistency, false positive, false negative, confidence.
 */

const db = require('../utils/db');

class DataQualityDashboard {
  /**
   * Generate comprehensive data quality report.
   */
  static async generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      metrics: {},
      recommendations: [],
    };

    // 1. Duplicates
    await this._measureDuplicates(report);

    // 2. Coverage by type
    await this._measureCoverage(report);

    // 3. Freshness
    await this._measureFreshness(report);

    // 4. Consistency
    await this._measureConsistency(report);

    // 5. Confidence distribution
    await this._measureConfidence(report);

    return report;
  }

  static async _measureDuplicates(report) {
    try {
      const dupes = await db.query(`
        SELECT type, COUNT(*) - COUNT(DISTINCT hash) as duplicates, COUNT(*) as total
        FROM evidence_registry GROUP BY type
      `);
      report.metrics.duplicates = {};
      for (const row of dupes.rows) {
        report.metrics.duplicates[row.type] = {
          total: parseInt(row.total),
          duplicates: parseInt(row.duplicates),
          rate: parseInt(row.total) > 0 ? (parseInt(row.duplicates) / parseInt(row.total) * 100).toFixed(1) + '%' : '0%',
        };
        if (parseInt(row.duplicates) > 0) {
          report.recommendations.push(`Remove ${row.duplicates} duplicate evidence entries for type "${row.type}"`);
        }
      }
    } catch { report.metrics.duplicates = { error: 'unavailable' }; }
  }

  static async _measureCoverage(report) {
    const types = ['phone', 'bank_account', 'url', 'domain', 'telegram', 'whatsapp', 'email', 'social_media', 'nik', 'npwp'];
    try {
      const counts = await db.query(`
        SELECT type, COUNT(*) as count, MIN(created_at) as earliest, MAX(created_at) as latest
        FROM evidence_registry GROUP BY type
      `);
      const coverage = {};
      for (const type of types) {
        const found = counts.rows.find(r => r.type === type);
        coverage[type] = {
          count: parseInt(found?.count || 0),
          earliest: found?.earliest || null,
          latest: found?.latest || null,
          covered: !!found,
        };
        if (!found) {
          report.recommendations.push(`No data collected for evidence type "${type}"`);
        }
      }
      report.metrics.coverage = coverage;
    } catch { report.metrics.coverage = { error: 'unavailable' }; }
  }

  static async _measureFreshness(report) {
    try {
      const freshness = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30d,
          COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days') as older_than_30d,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM evidence_registry
      `);
      const row = freshness.rows[0];
      report.metrics.freshness = {
        last24h: parseInt(row?.last_24h || 0),
        last7d: parseInt(row?.last_7d || 0),
        last30d: parseInt(row?.last_30d || 0),
        olderThan30d: parseInt(row?.older_than_30d || 0),
        oldest: row?.oldest || null,
        newest: row?.newest || null,
        staleness: parseInt(row?.older_than_30d || 0) > parseInt(row?.last_30d || 0)
          ? 'aging' : 'fresh',
      };
    } catch { report.metrics.freshness = { error: 'unavailable' }; }
  }

  static async _measureConsistency(report) {
    try {
      // Check that key fields have valid values
      const consistency = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE hash IS NULL OR hash = '') as null_hashes,
          COUNT(*) FILTER (WHERE type IS NULL OR type = '') as null_types,
          COUNT(*) FILTER (WHERE source IS NULL OR source = '') as null_sources,
          COUNT(*) as total
        FROM evidence_registry
      `);
      const row = consistency.rows[0];
      const total = parseInt(row?.total || 1);
      report.metrics.consistency = {
        nullHashes: parseInt(row?.null_hashes || 0),
        nullTypes: parseInt(row?.null_types || 0),
        nullSources: parseInt(row?.null_sources || 0),
        completeness: Math.round((1 - (parseInt(row?.null_hashes || 0) + parseInt(row?.null_types || 0) + parseInt(row?.null_sources || 0)) / (total * 3)) * 100) + '%',
      };
    } catch { report.metrics.consistency = { error: 'unavailable' }; }
  }

  static async _measureConfidence(report) {
    try {
      const confidence = await db.query(`
        SELECT
          AVG(confidence) as avg_confidence,
          COUNT(*) FILTER (WHERE confidence >= 80) as high_confidence,
          COUNT(*) FILTER (WHERE confidence >= 50 AND confidence < 80) as medium_confidence,
          COUNT(*) FILTER (WHERE confidence < 50) as low_confidence
        FROM evidence_registry
      `);
      const row = confidence.rows[0];
      report.metrics.confidence = {
        average: parseFloat(row?.avg_confidence || 0).toFixed(1),
        high: parseInt(row?.high_confidence || 0),
        medium: parseInt(row?.medium_confidence || 0),
        low: parseInt(row?.low_confidence || 0),
        distribution: {
          high: row?.high_confidence || 0,
          medium: row?.medium_confidence || 0,
          low: row?.low_confidence || 0,
        },
      };
    } catch { report.metrics.confidence = { error: 'unavailable' }; }
  }
}

module.exports = DataQualityDashboard;