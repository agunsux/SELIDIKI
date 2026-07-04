const express = require('express');
const router = express.Router();
const { hashInput } = require('../utils/crypto');
const ReportRepository = require('../repositories/ReportRepository');

const VALID_TARGET_TYPES = ['phone', 'account', 'link', 'whatsapp'];
const VALID_CATEGORIES = [
  'marketplace_scam',
  'fake_investment',
  'illegal_loan',
  'phishing',
  'fake_cs',
  'apk_malware',
  'romance_scam',
  'other',
];

/**
 * POST /api/v1/report
 * Submit fraud report
 */
router.post('/', async (req, res) => {
  try {
    const {
      target_type,
      target,
      category,
      description,
      evidence_url,
      reporter_hash,
    } = req.body;

    // Validation
    if (!target_type || !VALID_TARGET_TYPES.includes(target_type)) {
      return res.status(400).json({ error: 'target_type tidak valid' });
    }

    if (!target || typeof target !== 'string' || target.trim().length < 3) {
      return res.status(400).json({ error: 'Field "target" wajib diisi' });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'category tidak valid' });
    }

    const targetHash = hashInput(target.trim());
    const trackingId = `SLD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const report = await ReportRepository.insert({
      trackingId,
      targetType: target_type,
      targetHash,
      category,
      description: description?.slice(0, 1000),
      evidenceUrl: evidence_url,
      reporterHash: reporter_hash,
      confidence: 50,
    });

    res.json({
      success: true,
      tracking_id: trackingId,
      message: 'Laporan berhasil dikirim. Terima kasih telah melindungi komunitas!',
      submitted_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Gagal mengirim laporan' });
  }
});

/**
 * GET /api/v1/report/trending
 * Get trending fraud reports (public)
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;
    const reports = await ReportRepository.findTrending({
      limit: Math.min(parseInt(limit), 50),
      category,
    });

    res.json({
      success: true,
      data: reports,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Trending error:', err);
    res.status(500).json({ error: 'Gagal mengambil data trending' });
  }
});

module.exports = router;
