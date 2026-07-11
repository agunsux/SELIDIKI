// runtime/RuntimeValidator.js
/**
 * RuntimeValidator — ARGUS v1.1
 *
 * Orchestrates all startup dependency checks.
 * Runs DependencyChecker + EnvironmentValidator and produces
 * a unified runtime status report.
 */

const { DependencyChecker, STATUS } = require('./DependencyChecker');
const EnvironmentValidator = require('./EnvironmentValidator');

class RuntimeValidator {
  /**
   * Run all runtime checks.
   * @returns {Promise<{environment: Object, dependencies: Object, summary: Object}>}
   */
  static async runAllChecks() {
    const [dbCheck, redisCheck, firebaseCheck, smtpCheck, storageCheck, providerCheck] =
      await Promise.all([
        this._checkDatabase(),
        this._checkRedis(),
        this._checkFirebase(),
        this._checkSmtp(),
        this._checkStorage(),
        this._checkProviderApis(),
      ]);

    const environment = EnvironmentValidator.validate();
    const dependencies = {
      database: dbCheck,
      redis: redisCheck,
      firebase: firebaseCheck,
      smtp: smtpCheck,
      storage: storageCheck,
      providerApis: providerCheck,
    };

    const summary = this._computeSummary(environment, dependencies);

    return { environment, dependencies, summary };
  }

  /**
   * Quick lightweight health check (non-blocking).
   */
  static async quickHealth() {
    const results = await Promise.allSettled([
      this._checkDatabase(),
      this._checkRedis(),
    ]);

    const deps = {};
    for (const result of results) {
      const val = result.status === 'fulfilled' ? result.value : { status: STATUS.UNKNOWN, error: result.reason?.message };
      if (val.name === 'postgres') deps.postgres = val;
      if (val.name === 'redis') deps.redis = val;
    }

    const allOk = Object.values(deps).every(d => d.status === STATUS.AVAILABLE);
    return {
      status: allOk ? STATUS.AVAILABLE : STATUS.DEGRADED,
      dependencies: deps,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Private: individual dependency checks ──

  static async _checkDatabase() {
    try {
      const db = require('../utils/db');
      const start = Date.now();
      await db.query('SELECT 1');
      const latency = Date.now() - start;
      return { name: 'postgres', status: STATUS.AVAILABLE, latency };
    } catch (err) {
      // Try Firestore as fallback indicator
      try {
        const admin = require('firebase-admin');
        if (admin.apps.length > 0) {
          return { name: 'postgres', status: STATUS.DEGRADED, error: 'postgres_unavailable_firestore_active' };
        }
      } catch {}
      return { name: 'postgres', status: STATUS.UNAVAILABLE, error: err.message };
    }
  }

  static async _checkRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return { name: 'redis', status: STATUS.DEGRADED, error: 'REDIS_URL not configured, using memory cache' };
    }
    try {
      const { createClient } = require('redis');
      const client = createClient({ url: redisUrl });
      client.on('error', () => {});
      await client.connect();
      await client.ping();
      const info = await client.info('server');
      await client.quit();
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      return {
        name: 'redis',
        status: STATUS.AVAILABLE,
        version: versionMatch ? versionMatch[1].trim() : 'unknown',
      };
    } catch (err) {
      return { name: 'redis', status: STATUS.UNAVAILABLE, error: err.message };
    }
  }

  static async _checkFirebase() {
    try {
      const admin = require('firebase-admin');
      if (admin.apps.length === 0) {
        return { name: 'firebase', status: STATUS.UNAVAILABLE, error: 'Firebase not initialized' };
      }
      await admin.auth().listUsers(1);
      return { name: 'firebase', status: STATUS.AVAILABLE };
    } catch (err) {
      if (err.message && err.message.includes('app')) {
        return { name: 'firebase', status: STATUS.UNAVAILABLE, error: 'Firebase app not available' };
      }
      return { name: 'firebase', status: STATUS.DEGRADED, error: err.message };
    }
  }

  static async _checkSmtp() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT) || 587;
    if (!host) {
      return { name: 'smtp', status: STATUS.UNAVAILABLE, error: 'SMTP_HOST not configured' };
    }
    return DependencyChecker.checkTcp('smtp', host, port);
  }

  static async _checkStorage() {
    const bucket = process.env.STORAGE_BUCKET;
    if (!bucket) {
      return { name: 'storage', status: STATUS.DEGRADED, error: 'STORAGE_BUCKET not configured' };
    }
    return { name: 'storage', status: STATUS.AVAILABLE, bucket };
  }

  static async _checkProviderApis() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return { name: 'providerApis', status: STATUS.DEGRADED, error: 'GEMINI_API_KEY not configured' };
    }
    try {
      const resp = await DependencyChecker.checkUrl(
        'gemini',
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey.substring(0, 8)}...`,
        3000
      );
      return { name: 'providerApis', status: resp.status, detail: 'Gemini API' };
    } catch {
      return { name: 'providerApis', status: STATUS.UNKNOWN, error: 'Gemini API unreachable' };
    }
  }

  static _computeSummary(environment, dependencies) {
    const allChecks = [];

    // Flatten environment checks
    for (const [, domain] of Object.entries(environment)) {
      for (const check of domain.checks) {
        if (!check.optional) allChecks.push(check);
      }
    }

    // Add dependency checks
    for (const [, dep] of Object.entries(dependencies)) {
      allChecks.push(dep);
    }

    const total = allChecks.length;
    const available = allChecks.filter(c => c.status === STATUS.AVAILABLE).length;
    const degraded = allChecks.filter(c => c.status === STATUS.DEGRADED).length;
    const unavailable = allChecks.filter(c => c.status === STATUS.UNAVAILABLE).length;

    const overallStatus = unavailable > 0
      ? STATUS.UNAVAILABLE
      : degraded > 0
        ? STATUS.DEGRADED
        : STATUS.AVAILABLE;

    return {
      status: overallStatus,
      total,
      available,
      degraded,
      unavailable,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = RuntimeValidator;