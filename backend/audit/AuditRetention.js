// audit/AuditRetention.js
/**
 * AuditRetention — ARGUS v1.1
 *
 * Manages audit log retention policies.
 * Old logs are archived or purged based on retention configuration.
 */

const db = require('../utils/db');

class AuditRetention {
  /**
   * Purge audit logs older than the specified retention period.
   * @param {number} retentionDays - Number of days to retain
   * @returns {Promise<{purgedCount: number}>}
   */
  static async purgeOldLogs(retentionDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
      const result = await db.query(
        `DELETE FROM audit_logs WHERE created_at < $1 RETURNING id`,
        [cutoff.toISOString()]
      );
      const purgedCount = result.rowCount || 0;
      console.log(`AuditRetention: Purged ${purgedCount} logs older than ${retentionDays} days`);
      return { purgedCount };
    } catch (err) {
      console.error('AuditRetention: Purge failed:', err.message);
      return { purgedCount: 0 };
    }
  }

  /**
   * Archive old logs to a JSON file before purging.
   * @param {number} retentionDays
   * @param {string} archivePath - Filesystem path for archive
   * @returns {Promise<Object>}
   */
  static async archiveOldLogs(retentionDays = 90, archivePath = './audit_archive') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(archivePath)) {
        fs.mkdirSync(archivePath, { recursive: true });
      }

      const result = await db.query(
        `SELECT * FROM audit_logs WHERE created_at < $1 ORDER BY created_at`,
        [cutoff.toISOString()]
      );

      if (result.rows.length === 0) {
        return { archivedCount: 0 };
      }

      const filename = `audit_archive_${cutoff.toISOString().split('T')[0]}.json`;
      const filePath = path.join(archivePath, filename);
      fs.writeFileSync(filePath, JSON.stringify(result.rows, null, 2));

      console.log(`AuditRetention: Archived ${result.rows.length} logs to ${filePath}`);
      return { archivedCount: result.rows.length, file: filePath };
    } catch (err) {
      console.error('AuditRetention: Archive failed:', err.message);
      return { archivedCount: 0 };
    }
  }

  /**
   * Get retention statistics.
   * @returns {Promise<Object>}
   */
  static async getStats() {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) as total,
          MIN(created_at) as oldest,
          MAX(created_at) as newest,
          COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days') as older_than_30d,
          COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '90 days') as older_than_90d
        FROM audit_logs
      `);
      return result.rows[0] || { total: 0 };
    } catch {
      return { total: 0 };
    }
  }
}

module.exports = AuditRetention;