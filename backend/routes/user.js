const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const HistoryRepository = require('../repositories/HistoryRepository');
const UserRepository = require('../repositories/postgres/UserRepository');

/**
 * DELETE /api/v1/user/data
 * Delete all user data (UU PDP right to erasure)
 */
router.delete('/data', verifyFirebaseToken, async (req, res) => {
  try {
    const { user_hash } = req.body;

    if (!user_hash) {
      return res.status(400).json({ error: 'user_hash wajib diisi' });
    }

    const provider = process.env.DATABASE_PROVIDER || 'FIRESTORE';
    if (provider === 'POSTGRES' || provider === 'DUAL_WRITE') {
      await UserRepository.deleteByHash(user_hash);
    }

    res.json({
      success: true,
      message: 'Semua data kamu telah dihapus dari sistem kami.',
      deleted_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Delete data error:', err);
    res.status(500).json({ error: 'Gagal menghapus data' });
  }
});

/**
 * GET /api/v1/user/history
 * Get user scan history
 */
router.get('/history', verifyFirebaseToken, async (req, res) => {
  try {
    const { user_hash, limit = 20, offset = 0 } = req.query;

    if (!user_hash) {
      return res.status(400).json({ error: 'user_hash wajib diisi' });
    }

    const { data, total } = await HistoryRepository.findByUserHash(user_hash, parseInt(limit), parseInt(offset));
    res.json({
      success: true,
      data,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat' });
  }
});

module.exports = router;
