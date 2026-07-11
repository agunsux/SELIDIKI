// public/PublicAPIv2.js
/**
 * PublicAPIv2 — ARGUS v1.4
 *
 * Public Search API v2.
 * Single unified endpoint for all entity types.
 * POST /api/v2/search — Universal search
 * POST /api/v2/report — Submit report
 * GET /api/v2/status — API status
 * GET /api/v2/providers — Provider status
 * GET /api/v2/statistics — Aggregate statistics
 */

const express = require('express');
const router = express.Router();
const SearchPipeline = require('../search/SearchPipeline');
const EntityDetector = require('../search/EntityDetector');
const RelationshipExplorer = require('../search/RelationshipExplorer');
const AuditService = require('../audit/AuditService');
const db = require('../utils/db');
const SearchCache = require('../search/SearchCache');

// Rate limiting
const rateCounts = new Map();
function v2RateLimit(req, res, next) {
  const key = req.apiKey || req.ip;
  const limit = 30;
  const windowMs = 60000;
  const now = Date.now();
  const entry = rateCounts.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateCounts.set(key, entry);
  if (entry.count > limit) return res.status(429).json({ error: 'Rate limit exceeded' });
  next();
}

router.use(v2RateLimit);

/**
 * POST /api/v2/search
 * Universal search — one endpoint for all entity types.
 * Body: { query: "081234567890" }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, include_relationships } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Field "query" wajib diisi', success: false });
    }

    const cacheKey = `v2:${query.trim().toLowerCase()}`;
    const cached = await SearchCache.get(cacheKey);
    if (cached) { cached.performance.from_cache = true; return res.json({ success: true, data: cached }); }

    const result = await SearchPipeline.execute(query.trim());

    // Optionally include relationship exploration
    if (include_relationships && result.entity_hash) {
      try {
        result.relationship_graph = await RelationshipExplorer.explore(result.entity_hash, 1);
        result.relationship_score = await RelationshipExplorer.getRelationshipScore(result.entity_hash);
      } catch { result.relationship_graph = { nodeCount: 0, edgeCount: 0 }; }
    }

    await SearchCache.set(cacheKey, result, 60);
    await AuditService.logLookup({
      targetType: result.entity_type, targetId: result.entity_hash,
      ipAddress: req.ip, metadata: { api: 'v2', query },
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('v2 search error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/**
 * POST /api/v2/report
 * Simplified report submission.
 */
router.post('/report', async (req, res) => {
  try {
    const { query, category, description } = req.body;
    if (!query || !category) return res.status(400).json({ error: 'query and category required' });

    const detected = EntityDetector.detect(query);
    const trackingId = `V2-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    await AuditService.logReport({
      targetType: detected.type, targetId: query,
      reporterId: 'v2_public', category,
      ipAddress: req.ip, metadata: { api: 'v2', trackingId, description },
    });

    res.json({ success: true, data: { tracking_id: trackingId, type: detected.type, submitted_at: new Date().toISOString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Report failed' });
  }
});

/**
 * GET /api/v2/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true, data: {
      service: 'ARGUS Universal Intelligence Search',
      version: '1.4.0',
      status: 'operational',
      endpoints: ['/search', '/report', '/status', '/providers', '/statistics'],
      entityTypes: EntityDetector.getSupportedTypes(),
    },
  });
});

/**
 * GET /api/v2/providers
 */
router.get('/providers', async (req, res) => {
  try {
    const ProviderRegistry = require('../providers/ProviderRegistry');
    res.json({ success: true, data: { providers: ProviderRegistry.list() } });
  } catch {
    res.json({ success: true, data: { providers: [] } });
  }
});

/**
 * GET /api/v2/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const total = await db.query('SELECT COUNT(*) as c FROM fraud_events');
    const byType = await db.query('SELECT entity_type, COUNT(*) as c FROM fraud_events WHERE entity_type IS NOT NULL GROUP BY entity_type ORDER BY c DESC');
    res.json({
      success: true, data: {
        totalReports: parseInt(total.rows[0]?.c || 0),
        byEntityType: byType.rows.map(r => ({ type: r.entity_type, count: parseInt(r.c) })),
      },
    });
  } catch {
    res.json({ success: true, data: { totalReports: 0, byEntityType: [] } });
  }
});

module.exports = router;