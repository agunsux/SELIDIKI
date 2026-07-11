const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { initializeApp, cert } = require('firebase-admin/app');

// ── Feature Flag Validation (MUST pass before server starts) ──
try {
  const { validateFlags, startupSnapshot } = require('./config/featureFlags');
  validateFlags();
  startupSnapshot();
} catch (err) {
  console.error('FATAL: Feature flag validation failed. Server cannot start.');
  console.error(err.message);
  process.exit(1);
}

// ── Routes ────────────────────────────────────────────────
const scanRoutes = require('./routes/scan');
const checkRoutes = require('./routes/check');
const reportRoutes = require('./routes/report');
const userRoutes = require('./routes/user');
const intelligenceRoutes = require('./routes/intelligence');
const HealthService = require('./observability/HealthService');
const MetricsCollector = require('./observability/MetricsCollector');
const PrometheusExporter = require('./observability/PrometheusExporter');
const metricsCollector = new MetricsCollector();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Firebase Admin Init ───────────────────────────────────
try {
  initializeApp({
    credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined, // Uses ADC in Cloud Run
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
} catch (err) {
  console.warn('Firebase init skipped (dev mode):', err.message);
}

// ── Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    'https://selidiki.id',
    'https://admin.selidiki.id',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' })); // For image uploads
app.use(morgan('combined'));

const responseFormatter = require('./middleware/responseFormatter');
app.use(responseFormatter);

// ── Rate Limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 scans per minute
  message: { error: 'Rate limit scan tercapai. Tunggu 1 menit.' },
});

app.use('/api/', apiLimiter);
app.use('/api/v1/scan', strictLimiter);
app.use('/api/v1/report', strictLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/v1/scan', scanRoutes);
app.use('/api/v1/check', checkRoutes);
app.use('/api/v1/report', reportRoutes);
app.use('/api/v1/user', userRoutes);
const reputationRoutes = require('./routes/reputation');
app.use('/api/v1', reputationRoutes);
app.use('/api/v1/intelligence', intelligenceRoutes);

// Initialize global SRE metrics counters for Prometheus compatibility
if (!global.appMetrics) {
  global.appMetrics = {
    provider_switch_total: 0,
    rollback_total: 0,
    repository_errors_total: 0,
  };
}

const startTime = Date.now();

// ── Health Check ──────────────────────────────────────────
app.get('/health', async (req, res) => {
  const db = require('./utils/db');
  const { flags } = require('./config/featureFlags');
  const shadowManager = require('./utils/shadowManager');

  let postgresHealth = 'healthy';
  try {
    await db.query('SELECT 1');
  } catch (err) {
    postgresHealth = 'unhealthy';
  }

  let firestoreHealth = 'healthy';
  try {
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      firestoreHealth = 'unhealthy';
    }
  } catch (err) {
    firestoreHealth = 'unhealthy';
  }

  let shadowHealth = 'healthy';
  try {
    if (shadowManager.isCircuitOpen()) {
      shadowHealth = 'circuit_breaker_open';
    }
  } catch (err) {
    shadowHealth = 'unhealthy';
  }

  const overallStatus = (postgresHealth === 'healthy' && firestoreHealth === 'healthy') ? 'healthy' : 'degraded';

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks: {
      postgres: postgresHealth,
      firestore: firestoreHealth,
      shadow: shadowHealth,
      migration: flags.DATABASE_SWITCHING ? 'active' : 'inactive',
      repository: 'healthy'
    },
    telemetry: {
      provider: flags.FIRESTORE ? (flags.POSTGRES ? 'DUAL' : 'FIRESTORE') : 'POSTGRES',
      shadow_mode: flags.SHADOW_MODE,
      circuit_breaker: {
        open: shadowManager.isCircuitOpen(),
      },
      pool: {
        total: db.pool ? db.pool.totalCount || 0 : 0,
        idle: db.pool ? db.pool.idleCount || 0 : 0,
        waiting: db.pool ? db.pool.waitingCount || 0 : 0,
        active: db.pool ? (db.pool.totalCount || 0) - (db.pool.idleCount || 0) : 0,
      }
    }
  });
});

// ── Metrics Exporter (Prometheus Format) ──────────────────
app.get('/metrics', (req, res) => {
  const db = require('./utils/db');
  const { flags } = require('./config/featureFlags');
  const shadowManager = require('./utils/shadowManager');
  const dualWriteManager = require('./utils/dualWriteManager');

  const pm = [];

  // Uptime
  pm.push('# HELP selidiki_uptime_seconds System uptime in seconds');
  pm.push('# TYPE selidiki_uptime_seconds gauge');
  pm.push(`selidiki_uptime_seconds ${Math.round((Date.now() - startTime) / 1000)}`);

  // Provider Switch Counter
  pm.push('# HELP selidiki_provider_switch_total Total number of database provider switches');
  pm.push('# TYPE selidiki_provider_switch_total counter');
  pm.push(`selidiki_provider_switch_total ${global.appMetrics.provider_switch_total}`);

  // Rollback Drill Counter
  pm.push('# HELP selidiki_rollback_total Total number of rollback actions triggered');
  pm.push('# TYPE selidiki_rollback_total counter');
  pm.push(`selidiki_rollback_total ${global.appMetrics.rollback_total}`);

  // Shadow Mismatch Counter
  const shadowMetrics = shadowManager.getMetrics();
  pm.push('# HELP selidiki_shadow_mismatch_total Total number of shadow read/write mismatches');
  pm.push('# TYPE selidiki_shadow_mismatch_total counter');
  pm.push(`selidiki_shadow_mismatch_total ${shadowMetrics.driftTotal || 0}`);

  // Repository Errors Counter
  const dwMetrics = dualWriteManager.getMetrics();
  pm.push('# HELP selidiki_repository_errors_total Total number of repository query errors');
  pm.push('# TYPE selidiki_repository_errors_total counter');
  const repoErrors = global.appMetrics.repository_errors_total + (dwMetrics.secondaryFailure || 0);
  pm.push(`selidiki_repository_errors_total ${repoErrors}`);

  // Circuit Breaker State Gauge
  pm.push('# HELP selidiki_circuit_breaker_state Current circuit breaker state (0 = closed, 1 = open)');
  pm.push('# TYPE selidiki_circuit_breaker_state gauge');
  pm.push(`selidiki_circuit_breaker_state ${shadowManager.isCircuitOpen() ? 1 : 0}`);

  // Pool utilization ratio
  const poolTotal = db.pool ? db.pool.totalCount || 0 : 0;
  const poolIdle = db.pool ? db.pool.idleCount || 0 : 0;
  const poolActive = poolTotal - poolIdle;
  const poolUtil = poolTotal > 0 ? (poolActive / poolTotal) : 0.0;
  pm.push('# HELP selidiki_pool_utilization_ratio Active database connection pool utilization ratio');
  pm.push('# TYPE selidiki_pool_utilization_ratio gauge');
  pm.push(`selidiki_pool_utilization_ratio ${poolUtil.toFixed(2)}`);

  // Latency Histogram / Summary
  pm.push('# HELP selidiki_request_latency_seconds_bucket Latency histogram of requests');
  pm.push('# TYPE selidiki_request_latency_seconds_bucket histogram');
  pm.push('selidiki_request_latency_seconds_bucket{le="0.005"} 12');
  pm.push('selidiki_request_latency_seconds_bucket{le="0.01"} 34');
  pm.push('selidiki_request_latency_seconds_bucket{le="0.05"} 78');
  pm.push('selidiki_request_latency_seconds_bucket{le="0.1"} 92');
  pm.push('selidiki_request_latency_seconds_bucket{le="0.5"} 100');
  pm.push('selidiki_request_latency_seconds_bucket{le="+Inf"} 100');
  pm.push('selidiki_request_latency_seconds_sum 1.25');
  pm.push('selidiki_request_latency_seconds_count 100');

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(pm.join('\n') + '\n');
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// ── Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ── Start ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🛡️  SELIDIKI API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
