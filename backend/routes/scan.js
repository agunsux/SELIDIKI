const express = require('express');
const router = express.Router();
const { analyzeWithGemini } = require('../services/aiEngine');
const { hashInput } = require('../utils/crypto');
const { historyRepo } = require('../config/repositoryResolver');

/**
 * POST /api/v1/scan/message
 * Analyze SMS or WhatsApp message for scam
 */
router.post('/message', async (req, res) => {
  try {
    const { message, user_hash } = req.body;

    if (!message || typeof message !== 'string') {
      return res.apiError('Field "message" wajib diisi', 'Validasi gagal', 400);
    }

    if (message.length > 5000) {
      return res.apiError('Pesan terlalu panjang (max 5000 karakter)', 'Validasi gagal', 400);
    }

    const result = await analyzeWithGemini({
      input: message,
      type: 'message',
    });

    // Save to history (anonymous)
    if (user_hash) {
      await historyRepo.insert({
        userHash: user_hash,
        inputType: 'message',
        riskScore: result.risk_score,
        result,
      });
    }

    res.apiSuccess(result, 'Analisis pesan berhasil');
  } catch (err) {
    console.error('Scan message error:', err);
    res.apiError(err.message, 'Gagal menganalisis pesan', 500);
  }
});

/**
 * POST /api/v1/scan/url
 * Analyze URL for phishing
 */
router.post('/url', async (req, res) => {
  try {
    const { url, user_hash } = req.body;

    if (!url || typeof url !== 'string') {
      return res.apiError('Field "url" wajib diisi', 'Validasi gagal', 400);
    }

    // Basic URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.apiError('Format URL tidak valid', 'Validasi gagal', 400);
    }

    const result = await analyzeWithGemini({
      input: url,
      type: 'url',
      domain: parsedUrl.hostname,
    });

    if (user_hash) {
      await historyRepo.insert({
        userHash: user_hash,
        inputType: 'url',
        riskScore: result.risk_score,
        result,
      });
    }

    res.apiSuccess(
      {
        ...result,
        domain: parsedUrl.hostname,
      },
      'Analisis URL berhasil',
      { domain: parsedUrl.hostname }
    );
  } catch (err) {
    console.error('Scan URL error:', err);
    res.apiError(err.message, 'Gagal menganalisis URL', 500);
  }
});

/**
 * POST /api/v1/scan/screenshot
 * Analyze screenshot for scam content
 */
router.post('/screenshot', async (req, res) => {
  try {
    const { image_base64, user_hash } = req.body;

    if (!image_base64) {
      return res.apiError('Field "image_base64" wajib diisi', 'Validasi gagal', 400);
    }

    if (image_base64.length > 5500000) {
      return res.apiError('Ukuran gambar terlalu besar (max 4MB)', 'Validasi gagal', 400);
    }

    const result = await analyzeWithGemini({
      input: image_base64,
      type: 'screenshot',
      isImage: true,
    });

    if (user_hash) {
      await historyRepo.insert({
        userHash: user_hash,
        inputType: 'screenshot',
        riskScore: result.risk_score,
        result,
      });
    }

    res.apiSuccess(result, 'Analisis screenshot berhasil');
  } catch (err) {
    console.error('Scan screenshot error:', err);
    res.apiError(err.message, 'Gagal menganalisis screenshot', 500);
  }
});

module.exports = router;

