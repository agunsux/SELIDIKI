// search/EntityDetector.js
/**
 * EntityDetector — ARGUS v1.4
 *
 * Automatically detects entity type from raw query string.
 * Single entry point for all entity types — no more checkPhone(), checkBank(), etc.
 */

const SUPPORTED_TYPES = [
  'phone', 'bank_account', 'virtual_account', 'qris', 'ewallet',
  'domain', 'url', 'email', 'merchant', 'social_media', 'telegram',
  'whatsapp', 'nik', 'npwp', 'ip', 'unknown',
];

class EntityDetector {
  /**
   * Detect entity type from a raw query string.
   * @param {string} query - Raw user input
   * @returns {{ type: string, raw: string, confidence: number, hints: Object }}
   */
  static detect(query) {
    if (!query || typeof query !== 'string') return { type: 'unknown', raw: query, confidence: 0, hints: {} };

    const trimmed = query.trim();
    let type = 'unknown';
    let confidence = 0;
    const hints = {};

    // URL detection (must be checked before domain)
    if (/^https?:\/\//i.test(trimmed)) {
      type = 'url';
      confidence = 1.0;
      try {
        const parsed = new URL(trimmed);
        hints.domain = parsed.hostname.replace(/^www\./, '');
        hints.path = parsed.pathname;
      } catch {}
      return { type, raw: trimmed, confidence, hints };
    }

    // Email detection
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      type = 'email';
      confidence = 1.0;
      hints.domain = trimmed.split('@')[1];
      return { type, raw: trimmed, confidence, hints };
    }

    // Domain detection
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (domainRegex.test(trimmed)) {
      if (trimmed.includes('.com') || trimmed.includes('.id') || trimmed.includes('.co.id') || trimmed.includes('.net')) {
        type = 'domain';
        confidence = 0.95;
        hints.tld = trimmed.split('.').pop();
        return { type, raw: trimmed, confidence, hints };
      }
    }

    // Telegram detection
    if (trimmed.startsWith('@') || /^t\.me\//i.test(trimmed) || /^telegram\.me\//i.test(trimmed)) {
      type = 'telegram';
      confidence = 0.95;
      return { type, raw: trimmed, confidence, hints };
    }

    // QRIS detection (starts with QRIS or specific pattern)
    if (/^qris/i.test(trimmed) || /^[0-9]{12,}$/.test(trimmed.replace(/[^0-9]/g, ''))) {
      const digits = trimmed.replace(/[^0-9]/g, '');
      if (digits.length >= 12 && digits.length <= 20) {
        type = 'qris';
        confidence = 0.7;
        hints.digitCount = digits.length;
        return { type, raw: trimmed, confidence, hints };
      }
    }

    // NIK detection (16 digits)
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (digits.length === 16 && /^[0-9]{16}$/.test(digits)) {
      type = 'nik';
      confidence = 0.9;
      hints.provinceCode = digits.substring(0, 2);
      hints.birthDate = digits.substring(6, 12);
      return { type, raw: trimmed, confidence, hints };
    }

    // NPWP detection (15 digits)
    if (digits.length === 15) {
      type = 'npwp';
      confidence = 0.9;
      return { type, raw: trimmed, confidence, hints };
    }

    // Phone detection (8-15 digits)
    if (digits.length >= 8 && digits.length <= 15) {
      type = 'phone';
      confidence = 0.95;
      hints.digitCount = digits.length;
      hints.startsWith0 = trimmed.startsWith('0');
      hints.startsWith62 = trimmed.startsWith('62') || trimmed.startsWith('+62');
      return { type, raw: trimmed, confidence, hints };
    }

    // IP address detection
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(trimmed)) {
      type = 'ip';
      confidence = 0.95;
      return { type, raw: trimmed, confidence, hints };
    }

    // WhatsApp (phone number with whatsapp hint)
    if (/whatsapp|wa\.me|wa\.com/i.test(trimmed)) {
      type = 'whatsapp';
      confidence = 0.8;
      return { type, raw: trimmed, confidence, hints };
    }

    // Bank account (short numeric with possible bank code prefix)
    if (digits.length >= 5 && digits.length <= 20) {
      const hasAlphaPrefix = /^[a-zA-Z]+\d+$/.test(trimmed);
      if (hasAlphaPrefix && trimmed.length <= 25) {
        type = 'bank_account';
        confidence = 0.8;
        hints.bankCode = trimmed.replace(/[^a-zA-Z]/g, '').toUpperCase();
        hints.accountNumber = digits;
        return { type, raw: trimmed, confidence, hints };
      }
      // Virtual account (10-20 digits)
      if (digits.length >= 10 && digits.length <= 20) {
        type = 'virtual_account';
        confidence = 0.6;
        hints.digitCount = digits.length;
        return { type, raw: trimmed, confidence, hints };
      }
    }

    // Merchant / e-wallet / social media (fallback)
    if (trimmed.length >= 2 && trimmed.length <= 50) {
      if (/gojek|gopay|ovo|dana|shopeepay|linkaja|spay/i.test(trimmed)) {
        type = 'ewallet';
        confidence = 0.7;
      } else if (/toko|shop|store|merchant/i.test(trimmed)) {
        type = 'merchant';
        confidence = 0.5;
      } else {
        type = 'social_media';
        confidence = 0.3;
      }
      return { type, raw: trimmed, confidence, hints };
    }

    return { type: 'unknown', raw: trimmed, confidence: 0, hints: {} };
  }

  /**
   * Get all supported entity types.
   */
  static getSupportedTypes() {
    return [...SUPPORTED_TYPES];
  }
}

module.exports = EntityDetector;