// dashboard/DashboardAPI.js
/**
 * DashboardAPI — ARGUS v1.1
 *
 * Operational dashboard API endpoints.
 * No frontend redesign — APIs only.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { flags } = require('../config/featureFlags');
const MetricsCollector = require('../observability/MetricsCollector');
const HealthService = require('../observability/HealthService');
const AuditService = require('../audit/AuditService');

const metricsCollector = new MetricsCollector();

/**
 * GET /api/dashboard/system — System health and status overview
 */
router.get('/system', async (req, res) => {
  try {
    const health = await HealthService.check();
    const envCheck = require('../runtime/EnvironmentValidator');

    res.apiSuccess({
      status: health.status,
      uptime: Math.round((Date.now() - (global.appStartTime || Date.now())) / 1000),
      environment: process.env.NODE_ENV || 'development',
      featureFlags: {
        databaseSwitching: flags.DATABASE_SWITCHING,
        dualWrite: flags.DUAL_WRITE,
        dualRead: flags.DUAL_READ,
        shadowMode: flags.SHADOW_MODE,
      },
      environmentValidation: envCheck.validate(),
      timestamp: new Date().toISOString(),
    }, 'System status retrieved');
  } catch (err) {
    res.apiError(err.message, 'Failed to retrieve system status', 500);
  }
});

/**
 * GET /api/dashboard/statistics — Aggregate counters
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = {};

    // Entity counts
    try {
      const entities = await db.query('SELECT COUNT(*) as count FROM graph_nodes');
      stats.entities = parseInt(entities.rows[0]?.count || 0);
    } catch { stats.entities = 0; }

    // Report counts
    try {
      const reports = await db.query("SELECT COUNT(*) as count FROM fraud_events WHERE event_type='report'");
      stats.reports = parseInt(reports.rows[0]?.count || 0);
    } catch { stats.reports = 0; }

    // Decision counts
    try {
      const decisions = await db.query('SELECT COUNT(*) as count FROM decision_history');
      stats.decisions = parseInt(decisions.rows[0]?.count || 0);
    } catch { stats.decisions = 0; }

    // Lookup counts (approximate from audit)
    try {
      const lookups = await db.query("SELECT COUNT(*) as count FROM audit_logs WHERE action='LOOKUP'");
      stats.lookups = parseInt(lookups.rows[0]?.count || 0);
    } catch { stats.lookups = 0; }

    // Queue depth
    try {
      const queue = await db.query("SELECT COUNT(*) as count FROM moderation_queue WHERE status='pending'");
      stats.queueDepth = parseInt(queue.rows[0]?.count || 0);
    } catch { stats.queueDepth = 0; }

    // Recent activity (last 24h)
    try {
      const recent = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last24h,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last7d
        FROM audit_logs
      `);
      stats.activity24h = parseInt(recent.rows[0]?.last24h || 0);
      stats.activity7d = parseInt(recent.rows[0]?.last7d || 0);
    } catch { stats.activity24h = 0; stats.activity7d = 0; }

    res.apiSuccess(stats, 'Statistics retrieved');
  } catch (err) {
    res.apiError(err.message, 'Failed to retrieve statistics', 500);
  }
});

/**
 * GET /api/dashboard/providers — Provider status and latency
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = {
      database: {
        type: flags.FIRESTORE ? (flags.POSTGRES ? 'DUAL' : 'FIRESTORE') : 'POSTGRES',
        switching: flags.DATABASE_SWITCHING,
        dualWrite: flags.DUAL_WRITE,
        dualRead: flags.DUAL_READ,
      },
      firebase: {},
      gemini: {},
      redis: {},
    };

    // Database pool status
    try {
      const pool = db.pool;
      if (pool) {
        providers.database.pool = {
          total: pool.totalCount || 0,
          idle: pool.idleCount || 0,
          waiting: pool.waitingCount || 0,
          active: (pool.totalCount || 0) - (pool.idleCount || 0),
        };
      }
    } catch { /* pool info unavailable */ }

    // Firebase status
    try {
      const admin = require('firebase-admin');
      providers.firebase.status = admin.apps.length > 0 ? 'active' : 'inactive';
    } catch {
      providers.firebase.status = 'unavailable';
    }

    // Redis status
    const redisUrl = process.env.REDIS_URL;
    providers.redis.status = redisUrl ? 'configured' : 'not_configured';

    // Gemini status
    providers.gemini.status = process.env.GEMINI_API_KEY ? 'configured' : 'not_configured';

    res.apiSuccess(providers, 'Provider status retrieved');
  } catch (err) {
    res.apiError(err.message, 'Failed to retrieve provider status', 500);
  }
});

/**
 * GET /api/dashboard/errors — Recent errors and failures
 */
router.get('/errors', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    // Get error audit logs
    const errors = await db.query(`
      SELECT id, action, metadata, created_at
      FROM audit_logs
      WHERE severity IN ('error', 'critical')
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    // Count by type
    const counts = await db.query(`
      SELECT action, severity, COUNT(*) as count
      FROM audit_logs
      WHERE severity IN ('error', 'critical')
      GROUP BY action, severity
      ORDER BY count DESC
    `);

    res.apiSuccess({
      recent: errors.rows,
      byType: counts.rows,
      total: errors.rows.length,
    }, 'Errors retrieved');
  } catch (err) {
    res.apiError(err.message, 'Failed to retrieve errors', 500);
  }
});

/**
 * GET /api/dashboard/performance — Performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const snapshot = metricsCollector.snapshot();

    const performance = {
      memory: {
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      },
      cache: {
        hitRate: await _getCacheHitRate(),
        missRate: await _getCacheMissRate(),
      },
      latency: {
        lookup: snapshot.lookup_latency,
        decision: snapshot.decision_latency,
        graph: snapshot.graph_latency,
        timeline: snapshot.timeline_latency,
      },
      counts: {
        lookups: snapshot.lookups_total,
        decisions: snapshot.decisions_total,
        reports: snapshot.reports_total,
        errors: snapshot.errors_total,
      },
    };

    res.apiSuccess(performance, 'Performance metrics retrieved');
  } catch (err) {
    res.apiError(err.message, 'Failed to retrieve performance metrics', 500);
  }
});

async function _getCacheHitRate() {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE metadata->>'cacheHit' = 'true') as hits,
        COUNT(*) FILTER (WHERE metadata->>'cacheHit' = 'false') as misses
      FROM audit_logs
      WHERE action = 'LOOKUP'
        AND created_at > NOW() - INTERVAL '1 hour'
    `);
    const row = result.rows[0];
    const total = (parseInt(row?.hits || 0)) + (parseInt(row?.misses || 0));
    return total > 0 ? ((parseInt(row?.hits || 0) / total) * 100).toFixed(1) + '%' : 'N/A';
  } catch {
    return 'N/A';
  }
}

async function _getCacheMissRate() {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE metadata->>'cacheHit' = 'true') as hits,
        COUNT(*) FILTER (WHERE metadata->>'cacheHit' = 'false') as misses
      FROM audit_logs
      WHERE action = 'LOOKUP'
        AND created_at > NOW() - INTERVAL '1 hour'
    `);
    const row = result.rows[0];
    const total = (parseInt(row?.hits || 0)) + (parseInt(row?.misses || 0));
    return total > 0 ? ((parseInt(row?.misses || 0) / total) * 100).toFixed(1) + '%' : 'N/A';
  } catch {
    return 'N/A';
  }
}

module.exports = router;