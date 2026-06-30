const express = require('express');
const router = express.Router();
const { analyzeWithGemini } = require('../services/aiEngine');
const { hashInput } = require('../utils/crypto');
const { saveToHistory } = require('../services/historyService');

/**
 * POST /api/v1/scan/message
 * Analyze SMS or WhatsApp message for scam
 */
router.post('/message', async (req, res) => {
  try {
    const { message, user_hash } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Field "message" wajib diisi' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Pesan terlalu panjang (max 5000 karakter)' });
    }

    const result = await analyzeWithGemini({
      input: message,
      type: 'message',
    });

    // Save to history (anonymous)
    if (user_hash) {
      await saveToHistory({
        userHash: user_hash,
        inputType: 'message',
        riskScore: result.risk_score,
        result,
      });
    }

    res.json({
      success: true,
      data: result,
      analyzed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scan message error:', err);
    res.status(500).json({ error: 'Gagal menganalisis pesan' });
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
      return res.status(400).json({ error: 'Field "url" wajib diisi' });
    }

    // Basic URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Format URL tidak valid' });
    }

    const result = await analyzeWithGemini({
      input: url,
      type: 'url',
      domain: parsedUrl.hostname,
    });

    if (user_hash) {
      await saveToHistory({
        userHash: user_hash,
        inputType: 'url',
        riskScore: result.risk_score,
        result,
      });
    }

    res.json({
      success: true,
      data: result,
      domain: parsedUrl.hostname,
      analyzed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scan URL error:', err);
    res.status(500).json({ error: 'Gagal menganalisis URL' });
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
      return res.status(400).json({ error: 'Field "image_base64" wajib diisi' });
    }

    // Check file size (max 4MB base64 ≈ 3MB image)
    if (image_base64.length > 5_500_000) {
      return res.status(400).json({ error: 'Ukuran gambar terlalu besar (max 4MB)' });
    }

    const result = await analyzeWithGemini({
      input: image_base64,
      type: 'screenshot',
      isImage: true,
    });

    if (user_hash) {
      await saveToHistory({
        userHash: user_hash,
        inputType: 'screenshot',
        riskScore: result.risk_score,
        result,
      });
    }

    res.json({
      success: true,
      data: result,
      analyzed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scan screenshot error:', err);
    res.status(500).json({ error: 'Gagal menganalisis screenshot' });
  }
});

module.exports = router;
