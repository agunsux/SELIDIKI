const express = require('express');
const router = express.Router();
const { hashPhone, hashAccount } = require('../utils/crypto');
const PhoneRepository = require('../repositories/PhoneRepository');
const BankAccountRepository = require('../repositories/BankAccountRepository');

/**
 * GET /api/v1/check/phone/:number
 * Get phone reputation score
 */
router.get('/phone/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const cleaned = number.replace(/[^0-9]/g, '');

    if (cleaned.length < 8 || cleaned.length > 15) {
      return res.apiError('Nomor HP tidak valid', 'Validasi gagal', 400);
    }

    // Normalize to +62 format
    const normalized = cleaned.startsWith('0')
      ? '62' + cleaned.slice(1)
      : cleaned.startsWith('62')
      ? cleaned
      : '62' + cleaned;

    const phoneHash = hashPhone(normalized);
    const profile = (await PhoneRepository.findByHash(phoneHash)) || {
      riskScore: 0,
      reportsCount: 0,
      category: null,
      signals: [],
      lastActivity: null,
      firstReported: null,
    };

    res.apiSuccess(
      {
        phone_masked: '+62 ' + maskPhone(cleaned),
        phone_hash: phoneHash,
        risk_score: profile.riskScore,
        status: scoreToStatus(profile.riskScore),
        reports_count: profile.reportsCount,
        category: profile.category,
        signals: profile.signals,
        last_activity: profile.lastActivity,
        first_reported: profile.firstReported,
      },
      'Pengecekan nomor HP berhasil'
    );
  } catch (err) {
    console.error('Check phone error:', err);
    res.apiError(err.message, 'Gagal memeriksa nomor HP', 500);
  }
});

/**
 * GET /api/v1/check/account
 * Get bank account risk score
 * Query: ?bank=BCA&account=1234567890
 */
router.get('/account', async (req, res) => {
  try {
    const { bank, account } = req.query;

    if (!bank || !account) {
      return res.apiError('Parameter "bank" dan "account" wajib diisi', 'Validasi gagal', 400);
    }

    const cleanAccount = account.replace(/[^0-9]/g, '');
    if (cleanAccount.length < 8 || cleanAccount.length > 20) {
      return res.apiError('Nomor rekening tidak valid', 'Validasi gagal', 400);
    }

    const accountHash = hashAccount(cleanAccount, bank.toUpperCase());
    const profile = (await BankAccountRepository.findByHashAndBank(accountHash, bank.toUpperCase())) || {
      riskScore: 0,
      reportsCount: 0,
      categories: [],
    };

    res.apiSuccess(
      {
        account_masked: maskAccount(cleanAccount),
        bank: bank.toUpperCase(),
        account_hash: accountHash,
        risk_score: profile.riskScore,
        status: scoreToStatus(profile.riskScore),
        reports_count: profile.reportsCount,
        categories: profile.categories,
      },
      'Pengecekan rekening berhasil'
    );
  } catch (err) {
    console.error('Check account error:', err);
    res.apiError(err.message, 'Gagal memeriksa rekening', 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────

function scoreToStatus(score) {
  if (score >= 70) return 'HIGH_RISK';
  if (score >= 40) return 'WARNING';
  return 'SAFE';
}

function maskPhone(phone) {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 4) + '-xxxx-' + phone.slice(-4);
}

function maskAccount(account) {
  if (account.length <= 4) return account;
  return '*'.repeat(account.length - 4) + account.slice(-4);
}

module.exports = router;
