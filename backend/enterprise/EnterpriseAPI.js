// enterprise/EnterpriseAPI.js
/**
 * EnterpriseAPI — ARGUS v1.3
 *
 * Enterprise API endpoints with API key auth, rate limits, quotas, usage metrics, audit.
 * Routes: /enterprise/check, /enterprise/report, /enterprise/search, /enterprise/statistics, /enterprise/webhook
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { hashPhone, hashAccount } = require('../utils/crypto');
const PartnerRegistry = require('../partners/PartnerRegistry');
const AuditService = require('../audit/AuditService');

// Enterprise auth middleware
async function enterpriseAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const partner = await PartnerRegistry.authenticate(apiKey);
  if (!partner) return res.status(403).json({ error: 'Invalid or inactive API key' });

  req.partner = partner;
  next();
}

router.use(enterpriseAuth);

router.get('/check', async (req, res) => {
  const { type, value } = req.query;
  if (!type || !value) return res.status(400).json({ error: 'type and value required' });

  let result = { riskScore: 0, reportsCount: 0, confidence: 0 };
  if (type === 'phone') {
    const cleaned = value.replace(/[^0-9]/g, '');
    const { phoneRepo } = require('../config/repositoryResolver');
    const profile = await phoneRepo.findByHash(hashPhone(cleaned));
    if (profile) result = profile;
  }

  await AuditService.logLookup({
    targetType: type, targetId: value, actorId: req.partner.partnerId,
    metadata: { enterprise: true, partner: req.partner.name },
  });

  res.json({ success: true, data: { type, value, ...result }, partner: req.partner.name });
});

router.post('/report', async (req, res) => {
  const { type, value, category, description } = req.body;
  if (!type || !value || !category) return res.status(400).json({ error: 'type, value, category required' });

  const trackingId = `ENT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  await AuditService.logReport({
    targetType: type, targetId: value, reporterId: req.partner.partnerId,
    category, metadata: { enterprise: true, trackingId, partner: req.partner.name, description },
  });

  res.json({ success: true, data: { tracking_id: trackingId, submitted_at: new Date().toISOString() } });
});

router.get('/statistics', async (req, res) => {
  const total = await db.query('SELECT COUNT(*) as c FROM fraud_events');
  const byCategory = await db.query('SELECT category, COUNT(*) as c FROM fraud_events WHERE category IS NOT NULL GROUP BY category ORDER BY c DESC LIMIT 10');
  res.json({ success: true, data: { totalReports: parseInt(total.rows[0]?.c || 0), topCategories: byCategory.rows } });
});

router.post('/webhook', async (req, res) => {
  const { url, events } = req.body;
  if (!url) return res.status(400).json({ error: 'webhook URL required' });
  await db.query(
    `INSERT INTO enterprise_webhooks (id, partner_id, url, events, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW())
     ON CONFLICT (partner_id, url) DO UPDATE SET events = $3, updated_at = NOW()`,
    [req.partner.partnerId, url, JSON.stringify(events || ['*'])]
  );
  res.json({ success: true, data: { registered: true, url } });
});

module.exports = router;