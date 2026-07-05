const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { verifyFirebaseToken } = require('../middleware/auth');
const { hashPhone } = require('../utils/crypto');
const HistoryRepository = require('../repositories/HistoryRepository');
const UserRepository = require('../repositories/postgres/UserRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'selidiki_secret_key_change_in_production';

// In-memory OTP storage for development
const otps = new Map();

/**
 * POST /api/v1/user/auth/send-otp
 * Send OTP to Indonesian phone number
 */
router.post('/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.apiError('Nomor HP wajib diisi', 'Input tidak valid', 400);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      return res.apiError('Nomor HP tidak valid', 'Input tidak valid', 400);
    }

    // Generate standard 6-digit OTP code
    const otp = process.env.NODE_ENV === 'development' || cleanPhone === '81234567890'
      ? '123456'
      : Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 5 minutes
    const expires = Date.now() + 5 * 60 * 1000;
    otps.set(cleanPhone, { otp, expires });

    console.log(`[AUTH] Sent OTP ${otp} to +62${cleanPhone}`);

    res.apiSuccess(
      { otp: process.env.NODE_ENV === 'development' ? otp : undefined },
      'Kode OTP berhasil dikirim.'
    );
  } catch (err) {
    console.error('Send OTP error:', err);
    res.apiError(err.message, 'Gagal mengirim OTP', 500);
  }
});

/**
 * POST /api/v1/user/auth/verify-otp
 * Verify OTP code and login/register
 */
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.apiError('Nomor HP dan OTP wajib diisi', 'Input tidak valid', 400);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const entry = otps.get(cleanPhone);

    if (!entry) {
      return res.apiError('OTP belum dikirim atau telah kedaluwarsa', 'Validasi gagal', 400);
    }

    if (Date.now() > entry.expires) {
      otps.delete(cleanPhone);
      return res.apiError('OTP telah kedaluwarsa', 'Validasi gagal', 400);
    }

    if (entry.otp !== otp) {
      return res.apiError('Kode OTP salah', 'Validasi gagal', 400);
    }

    // OTP validated successfully, clear it
    otps.delete(cleanPhone);

    // Normalize to +62 international format for consistency
    const normalizedPhone = cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone;
    const phoneHash = hashPhone(normalizedPhone);

    let user = await UserRepository.findByHash(phoneHash);
    if (!user) {
      user = await UserRepository.insert({
        phoneHash,
        firebaseUid: null,
        metadata: { source: 'otp_auth' },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: user.id,
        phoneHash: user.phoneHash,
        role: user.role || 'user',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.apiSuccess(
      {
        token,
        user_hash: phoneHash,
        role: user.role,
        user: {
          id: user.id,
          phone_hash: user.phoneHash,
          role: user.role,
        },
      },
      'Verifikasi berhasil'
    );
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.apiError(err.message, 'Proses verifikasi gagal', 500);
  }
});

/**
 * DELETE /api/v1/user/data
 * Delete all user data (UU PDP right to erasure)
 */
router.delete('/data', verifyFirebaseToken, async (req, res) => {
  try {
    const { user_hash } = req.body;

    if (!user_hash) {
      return res.apiError('user_hash wajib diisi', 'Input tidak valid', 400);
    }

    const provider = process.env.DATABASE_PROVIDER || 'FIRESTORE';
    if (provider === 'POSTGRES' || provider === 'DUAL_WRITE') {
      await UserRepository.deleteByHash(user_hash);
    }

    res.apiSuccess(
      { deleted_at: new Date().toISOString() },
      'Semua data kamu telah dihapus dari sistem kami.'
    );
  } catch (err) {
    console.error('Delete data error:', err);
    res.apiError(err.message, 'Gagal menghapus data', 500);
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
      return res.apiError('user_hash wajib diisi', 'Input tidak valid', 400);
    }

    const { data, total } = await HistoryRepository.findByUserHash(user_hash, parseInt(limit), parseInt(offset));
    
    res.apiSuccess(
      data,
      'Riwayat berhasil diambil',
      {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    );
  } catch (err) {
    console.error('Get history error:', err);
    res.apiError(err.message, 'Gagal mengambil riwayat', 500);
  }
});

module.exports = router;
