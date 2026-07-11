// audit/AuditExporter.js
/**
 * AuditExporter — ARGUS v1.1
 *
 * Exports audit logs in JSON or CSV format.
 */

class AuditExporter {
  /**
   * Export audit rows in the specified format.
   * @param {Object[]} rows - Audit log rows from repository
   * @param {string} format - 'json' or 'csv'
   * @returns {string} Formatted content
   */
  static export(rows, format = 'json') {
    switch (format.toLowerCase()) {
      case 'csv':
        return this._toCsv(rows);
      case 'json':
      default:
        return this._toJson(rows);
    }
  }

  static _toJson(rows) {
    return JSON.stringify(rows, null, 2);
  }

  static _toCsv(rows) {
    if (!rows || rows.length === 0) {
      return 'id,action,actor_type,actor_id,target_type,target_id,severity,created_at\n';
    }

    const headers = ['id', 'action', 'actor_type', 'actor_id', 'target_type', 'target_id', 'severity', 'created_at', 'metadata'];
    const lines = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) return '';
        val = String(val);
        // Escape CSV: wrap in quotes if contains comma or quote
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      });
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }
}

module.exports = AuditExporter;