const express = require('express');
const router = express.Router();
const multer = require('multer');
const { hashInput, hashPhone, hashAccount } = require('../utils/crypto');
const { verifyFirebaseToken } = require('../middleware/auth');
const { reportRepo } = require('../config/repositoryResolver');
const StorageService = require('../services/storageService');

const upload = multer({ storage: multer.memoryStorage() });

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
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const {
      target_type,
      target,
      category,
      description,
      evidence_url,
      reporter_hash,
      bank_code,
    } = req.body;

    // Validation
    if (!target_type || !VALID_TARGET_TYPES.includes(target_type)) {
      return res.apiError('target_type tidak valid', 'Validasi gagal', 400);
    }

    if (!target || typeof target !== 'string' || target.trim().length < 3) {
      return res.apiError('Field "target" wajib diisi', 'Validasi gagal', 400);
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.apiError('category tidak valid', 'Validasi gagal', 400);
    }

    let targetHash;
    if (target_type === 'phone') {
      targetHash = hashPhone(target);
    } else if (target_type === 'account') {
      targetHash = hashAccount(target, bank_code || 'UNKNOWN');
    } else {
      targetHash = hashInput(`${target_type}:${target.trim()}`);
    }
    const trackingId = `SLD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const report = await reportRepo.insert({
      trackingId,
      targetType: target_type,
      targetHash,
      category,
      description: description?.slice(0, 1000),
      evidenceUrl: evidence_url,
      reporterHash: req.user.phoneHash || reporter_hash || null,
      confidence: 50,
      bankCode: bank_code,
    });

    res.apiSuccess(
      {
        tracking_id: trackingId,
        submitted_at: new Date().toISOString(),
      },
      'Laporan berhasil dikirim. Terima kasih telah melindungi komunitas!'
    );
  } catch (err) {
    console.error('Report error:', err);
    res.apiError(err.message, 'Gagal mengirim laporan', 500);
  }
});

/**
 * GET /api/v1/report/trending
 * Get trending fraud reports (public)
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;
    const reports = await reportRepo.findTrending({
      limit: Math.min(parseInt(limit), 50),
      category,
    });

    res.apiSuccess(reports, 'Trending laporan berhasil diambil');
  } catch (err) {
    console.error('Trending error:', err);
    res.apiError(err.message, 'Gagal mengambil data trending', 500);
  }
});

/**
 * POST /api/v1/report/evidence/upload
 * Upload evidence file (image/pdf)
 */
router.post('/evidence/upload', verifyFirebaseToken, upload.single('evidence'), async (req, res) => {
  try {
    if (!req.file) {
      return res.apiError('File evidence tidak ditemukan', 'Upload gagal', 400);
    }

    const fileUrl = await StorageService.upload(req.file);

    res.apiSuccess(
      {
        evidence_url: fileUrl,
        filename: req.file.originalname,
        uploaded_at: new Date().toISOString(),
      },
      'Evidence berhasil diunggah'
    );
  } catch (err) {
    console.error('Evidence upload error:', err);
    res.apiError(err.message, 'Gagal mengunggah evidence', 400);
  }
});

module.exports = router;
