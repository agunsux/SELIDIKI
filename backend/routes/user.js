const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');

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

    // TODO: Delete from Firestore, PostgreSQL
    // await deleteUserData(user_hash);

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

    // TODO: Fetch from database
    res.json({
      success: true,
      data: [],
      total: 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil riwayat' });
  }
});

module.exports = router;
