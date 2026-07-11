// evidence/EvidenceNormalizer.js
/**
 * EvidenceNormalizer — ARGUS v1.2
 *
 * Normalizes all evidence types to standard formats before hashing and storage.
 * Uses existing normalizers from normalizers/ for phone, bank, ewallet, url.
 */

const PhoneNormalizer = require('../normalizers/phoneNormalizer');
const BankNormalizer = require('../normalizers/bankNormalizer');
const EwalletNormalizer = require('../normalizers/ewalletNormalizer');
const UrlNormalizer = require('../normalizers/urlNormalizer');

const normalizers = {
  phone: new PhoneNormalizer(),
  bank_account: new BankNormalizer(),
  ewallet: new EwalletNormalizer(),
  url: new UrlNormalizer(),
  domain: new UrlNormalizer(),
};

class EvidenceNormalizer {
  /**
   * Normalize an evidence value by type.
   * @param {string} type - Evidence type
   * @param {string} value - Raw value
   * @returns {string} Normalized value
   */
  static normalize(type, value) {
    switch (type) {
      case 'phone':
        return normalizers.phone.normalize(value);

      case 'bank_account':
        return normalizers.bank_account.normalize(value);

      case 'ewallet':
        return normalizers.ewallet.normalize(value);

      case 'url':
      case 'domain':
        return this._normalizeDomain(value);

      case 'telegram':
        return this._normalizeTelegram(value);

      case 'whatsapp':
        return normalizers.phone.normalize(value);

      case 'email':
        return this._normalizeEmail(value);

      case 'social_media':
        return this._normalizeSocialMedia(value);

      default:
        return value.trim().toLowerCase();
    }
  }

  static _normalizeDomain(value) {
    let cleaned = value.trim().toLowerCase();
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = 'http://' + cleaned;
    }
    try {
      const parsed = new URL(cleaned);
      let hostname = parsed.hostname;
      if (hostname.startsWith('www.')) hostname = hostname.substring(4);
      return hostname;
    } catch {
      return cleaned.replace(/^www\./, '').replace(/[^a-z0-9.-]/g, '');
    }
  }

  static _normalizeTelegram(value) {
    let cleaned = value.trim();
    // Remove @ prefix if present
    if (cleaned.startsWith('@')) cleaned = cleaned.substring(1);
    // Remove t.me/ or telegram.me/ prefix
    cleaned = cleaned.replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//, '');
    return cleaned.toLowerCase();
  }

  static _normalizeEmail(value) {
    return value.trim().toLowerCase();
  }

  static _normalizeSocialMedia(value) {
    let cleaned = value.trim().toLowerCase();
    // Remove URL prefix
    cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?[a-z]+\.[a-z]+\//, '');
    // Remove @ prefix
    if (cleaned.startsWith('@')) cleaned = cleaned.substring(1);
    return cleaned;
  }
}

module.exports = EvidenceNormalizer;