// search/SearchRouter.js
/**
 * SearchRouter — ARGUS v1.4
 *
 * Express router for universal search. Single POST endpoint for all entity types.
 */

const express = require('express');
const router = express.Router();
const SearchPipeline = require('./SearchPipeline');
const SearchCache = require('./SearchCache');
const AuditService = require('../audit/AuditService');

/**
 * POST /api/v1/search
 * Universal search for any entity type.
 * Body: { query: "081234567890" }
 */
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Field "query" wajib diisi', success: false });
    }
    if (query.length > 500) {
      return res.status(400).json({ error: 'Query terlalu panjang (max 500 karakter)', success: false });
    }

    // Check cache first
    const cacheKey = `search:${query.trim().toLowerCase()}`;
    const cached = await SearchCache.get(cacheKey);
    if (cached) {
      cached.performance.from_cache = true;
      return res.json({ success: true, data: cached });
    }

    // Execute pipeline
    const result = await SearchPipeline.execute(query.trim());

    // Cache result
    await SearchCache.set(cacheKey, result, 60);

    // Audit
    await AuditService.logLookup({
      targetType: result.entity_type,
      targetId: result.entity_hash,
      actorId: req.user?.phoneHash || null,
      ipAddress: req.ip,
      metadata: { universal_search: true, query },
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Gagal memproses pencarian', success: false });
  }
});

/**
 * GET /api/v1/search/types
 * List supported entity types.
 */
router.get('/types', (req, res) => {
  const EntityDetector = require('./EntityDetector');
  res.json({ success: true, data: { types: EntityDetector.getSupportedTypes() } });
});

module.exports = router;