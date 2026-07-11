// public/PublicAPI.js
/**
 * PublicAPI — ARGUS v1.2
 *
 * Public Intelligence API endpoints.
 * GET /api/public/check
 * GET /api/public/report
 * GET /api/public/status
 * GET /api/public/statistics
 *
 * All endpoints are rate-limited.
 * API Keys supported.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { hashPhone, hashAccount, hashInput } = require('../utils/crypto');
const AuditService = require('../audit/AuditService');

const RATE_LIMIT = {
  anonymous: { windowMs: 60000, max: 10 },
  apiKey: { windowMs: 60000, max: 100 },
};

// Simple in-memory rate limiter for public API
const rateCounts = new Map();

function publicRateLimit(req, res, next) {
  const key = req.apiKey || req.ip;
  const limit = req.apiKey ? RATE_LIMIT.apiKey.max : RATE_LIMIT.anonymous.max;
  const windowMs = RATE_LIMIT.apiKey.windowMs;

  const now = Date.now();
  const entry = rateCounts.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  rateCounts.set(key, entry);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
  res.setHeader('X-RateLimit-Reset', entry.resetAt);

  if (entry.count > limit) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.', retryAfter: Math.ceil((entry.resetAt - now) / 1000) });
  }
  next();
}

// Optional API key authentication
function optionalApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key) {
    // Validate against configured API keys
    const validKeys = (process.env.PUBLIC_API_KEYS || '').split(',').map(k => k.trim());
    if (validKeys.includes(key)) {
      req.apiKey = key;
      req.authenticated = true;
    } else {
      // Invalid key — still allow, but track as anonymous
      req.apiKey = null;
      req.authenticated = false;
    }
  }
  next();
}

// Apply middleware to all public routes
router.use(optionalApiKey);
router.use(publicRateLimit);

/**
 * GET /api/public/check — Check an entity (phone or account)
 * Query: ?type=phone&value=08123456789 or ?type=account&value=BCA:1234567890
 */
router.get('/check', async (req, res) => {
  try {
    const { type, value } = req.query;

    if (!type || !value) {
      return res.status(400).json({ error: 'Parameters "type" and "value" are required' });
    }

    if (!['phone', 'account', 'url'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "phone", "account", or "url"' });
    }

    let entityHash;
    let result;

    if (type === 'phone') {
      const cleaned = value.replace(/[^0-9]/g, '');
      if (cleaned.length < 8 || cleaned.length > 15) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }
      entityHash = hashPhone(cleaned);
      result = await _lookupPhone(cleaned, entityHash);
    } else if (type === 'account') {
      const parts = value.split(':');
      const bank = parts[0] || '';
      const account = parts.slice(1).join('');
      const cleaned = account.replace(/[^0-9]/g, '');
      if (cleaned.length < 5) {
        return res.status(400).json({ error: 'Invalid account number' });
      }
      entityHash = hashAccount(cleaned, bank.toUpperCase());
      result = await _lookupAccount(cleaned, bank.toUpperCase(), entityHash);
    } else {
      // URL
      entityHash = hashInput(value.trim().toLowerCase());
      result = { entityHash, message: 'URL check via public API' };
    }

    await AuditService.logLookup({
      targetType: type,
      targetId: entityHash,
      actorId: req.apiKey || null,
      ipAddress: req.ip,
      metadata: { public: true, result: 'success' },
    });

    res.json({
      success: true,
      data: {
        type,
        entity_hash: entityHash,
        risk_score: result.riskScore,
        status: _scoreToStatus(result.riskScore),
        reports_count: result.reportsCount,
        confidence: result.confidence,
        last_reported: result.lastActivity,
      },
      meta: {
        api: 'public',
        authenticated: !!req.apiKey,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Public API check error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/public/report — Submit a fraud report (simplified)
 * Query: ?type=phone&value=08123456789&category=scam
 */
router.get('/report', async (req, res) => {
  try {
    const { type, value, category, description } = req.query;

    if (!type || !value || !category) {
      return res.status(400).json({ error: 'Parameters "type", "value", and "category" are required' });
    }

    const trackingId = `PUB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    await AuditService.logReport({
      targetType: type,
      targetId: value,
      reporterId: req.apiKey || 'anonymous',
      category,
      ipAddress: req.ip,
      metadata: { public: true, trackingId, description: description?.slice(0, 500) },
    });

    res.json({
      success: true,
      data: {
        tracking_id: trackingId,
        message: 'Report submitted successfully. Thank you for helping the community!',
        submitted_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Public API report error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/public/status — Public API status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'ARGUS Public Intelligence API',
      version: '1.2.0',
      status: 'operational',
      endpoints: ['/check', '/report', '/status', '/statistics'],
      documentation: 'https://argus.id/docs/public-api',
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/public/statistics — Public aggregate statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = {};

    try {
      const total = await db.query('SELECT COUNT(*) as count FROM fraud_events');
      stats.total_reports = parseInt(total.rows[0]?.count || 0);
    } catch { stats.total_reports = 0; }

    try {
      const entities = await db.query('SELECT COUNT(*) as count FROM graph_nodes');
      stats.total_entities = parseInt(entities.rows[0]?.count || 0);
    } catch { stats.total_entities = 0; }

    try {
      const categories = await db.query(
        'SELECT category, COUNT(*) as count FROM fraud_events WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 5'
      );
      stats.top_categories = categories.rows.map(r => ({ category: r.category, count: parseInt(r.count) }));
    } catch { stats.top_categories = []; }

    // Last 24h activity
    try {
      const recent = await db.query(
        "SELECT COUNT(*) as count FROM fraud_events WHERE timestamp > NOW() - INTERVAL '24 hours'"
      );
      stats.reports_24h = parseInt(recent.rows[0]?.count || 0);
    } catch { stats.reports_24h = 0; }

    res.json({
      success: true,
      data: stats,
      meta: { api: 'public', timestamp: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Helpers ──

async function _lookupPhone(cleaned, phoneHash) {
  try {
    const { phoneRepo } = require('../config/repositoryResolver');
    const profile = await phoneRepo.findByHash(phoneHash);
    return profile || { riskScore: 0, reportsCount: 0, confidence: 0, lastActivity: null };
  } catch {
    return { riskScore: 0, reportsCount: 0, confidence: 0, lastActivity: null };
  }
}

async function _lookupAccount(account, bank, accountHash) {
  try {
    const { bankAccountRepo } = require('../config/repositoryResolver');
    const profile = await bankAccountRepo.findByHashAndBank(accountHash, bank);
    return profile || { riskScore: 0, reportsCount: 0, confidence: 0, lastActivity: null };
  } catch {
    return { riskScore: 0, reportsCount: 0, confidence: 0, lastActivity: null };
  }
}

function _scoreToStatus(score) {
  if (score >= 70) return 'HIGH_RISK';
  if (score >= 40) return 'WARNING';
  return 'SAFE';
}

module.exports = router;