// audit/AuditService.js
/**
 * AuditService — ARGUS v1.1
 *
 * High-level audit service that routes audit events to the repository.
 * Every important action must generate immutable audit logs.
 */

const AuditRepository = require('./AuditRepository');
const AuditExporter = require('./AuditExporter');

const AUDIT_ACTIONS = {
  LOOKUP: 'LOOKUP',
  REPORT: 'REPORT',
  MODERATION: 'MODERATION',
  DECISION: 'DECISION',
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  DATASET_IMPORT: 'DATASET_IMPORT',
  REPORT_EXPORT: 'REPORT_EXPORT',
  CONFIG_CHANGE: 'CONFIG_CHANGE',
  PROVIDER_SWITCH: 'PROVIDER_SWITCH',
  USER_DELETE: 'USER_DELETE',
};

class AuditService {
  /**
   * Initialize the audit system (creates table if needed).
   */
  static async init() {
    await AuditRepository.ensureTable();
  }

  /**
   * Log a lookup event.
   */
  static async logLookup({ targetType, targetId, actorId, ipAddress, userAgent, metadata }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.LOOKUP,
      actorType: actorId ? 'user' : 'anonymous',
      actorId,
      targetType,
      targetId,
      ipAddress,
      userAgent,
      metadata: { ...metadata, result: metadata?.result },
      severity: 'info',
    });
  }

  /**
   * Log a report submission.
   */
  static async logReport({ targetType, targetId, reporterId, category, ipAddress, metadata }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.REPORT,
      actorType: 'user',
      actorId: reporterId,
      targetType,
      targetId,
      ipAddress,
      metadata: { category, ...metadata },
      severity: 'warning',
    });
  }

  /**
   * Log a moderation action.
   */
  static async logModeration({ action, moderatorId, targetType, targetId, reason, metadata }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.MODERATION,
      actorType: 'admin',
      actorId: moderatorId,
      targetType,
      targetId,
      metadata: { moderationAction: action, reason, ...metadata },
      severity: 'warning',
    });
  }

  /**
   * Log a decision made by the decision engine.
   */
  static async logDecision({ entityHash, riskScore, decision, metadata }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.DECISION,
      actorType: 'system',
      actorId: 'decision-engine',
      targetType: 'entity',
      targetId: entityHash,
      metadata: { riskScore, decision, ...metadata },
      severity: 'info',
    });
  }

  /**
   * Log admin login.
   */
  static async logAdminLogin({ adminId, ipAddress, userAgent, success }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.ADMIN_LOGIN,
      actorType: 'admin',
      actorId: adminId,
      ipAddress,
      userAgent,
      metadata: { success },
      severity: success ? 'info' : 'critical',
    });
  }

  /**
   * Log dataset import.
   */
  static async logDatasetImport({ datasetName, recordCount, importedBy, status, metadata }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.DATASET_IMPORT,
      actorType: importedBy ? 'admin' : 'system',
      actorId: importedBy,
      targetType: 'dataset',
      targetId: datasetName,
      metadata: { recordCount, status, ...metadata },
      severity: status === 'success' ? 'info' : 'error',
    });
  }

  /**
   * Log a configuration change.
   */
  static async logConfigChange({ changedBy, changes }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.CONFIG_CHANGE,
      actorType: 'admin',
      actorId: changedBy,
      targetType: 'config',
      metadata: { changes },
      severity: 'warning',
    });
  }

  /**
   * Log a provider switch.
   */
  static async logProviderSwitch({ fromProvider, toProvider, triggeredBy }) {
    return AuditRepository.insert({
      action: AUDIT_ACTIONS.PROVIDER_SWITCH,
      actorType: triggeredBy || 'system',
      actorId: triggeredBy || 'auto-failover',
      targetType: 'provider',
      metadata: { from: fromProvider, to: toProvider },
      severity: 'critical',
    });
  }

  /**
   * Query audit logs.
   */
  static async query(filters = {}) {
    return AuditRepository.query(filters);
  }

  /**
   * Get a single audit log entry.
   */
  static async getById(id) {
    return AuditRepository.getById(id);
  }

  /**
   * Export audit logs in specified format.
   * @param {Object} filters - Query filters
   * @param {string} format - 'json' or 'csv'
   * @returns {Promise<string>} Formatted export content
   */
  static async export(filters = {}, format = 'json') {
    const data = await AuditRepository.query(filters);
    return AuditExporter.export(data.rows, format);
  }

  /**
   * Get audit statistics.
   */
  static async getStats(since) {
    return AuditRepository.countByAction(since);
  }

  /**
   * Get available audit action types.
   */
  static getActions() {
    return Object.values(AUDIT_ACTIONS);
  }
}

module.exports = AuditService;