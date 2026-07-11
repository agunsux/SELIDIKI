// evidence/EvidenceValidator.js
/**
 * EvidenceValidator — ARGUS v1.2
 *
 * Validates evidence values based on type before acceptance.
 * Ensures only valid data enters the system.
 */

class EvidenceValidator {
  /**
   * Validate an evidence value by type.
   * @param {string} type - Evidence type
   * @param {string} value - Raw value
   * @returns {{valid: boolean, error: string|null, cleaned: string|null}}
   */
  static validate(type, value) {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Value must be a non-empty string', cleaned: null };
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Value cannot be empty', cleaned: null };
    }

    switch (type) {
      case 'phone':
        return this._validatePhone(trimmed);
      case 'bank_account':
        return this._validateBankAccount(trimmed);
      case 'url':
        return this._validateUrl(trimmed);
      case 'domain':
        return this._validateDomain(trimmed);
      case 'telegram':
        return this._validateTelegram(trimmed);
      case 'whatsapp':
        return this._validatePhone(trimmed);
      case 'email':
        return this._validateEmail(trimmed);
      case 'social_media':
        return { valid: true, error: null, cleaned: trimmed };
      case 'nik':
        return this._validateNik(trimmed);
      case 'npwp':
        return this._validateNpwp(trimmed);
      default:
        return { valid: true, error: null, cleaned: trimmed };
    }
  }

  static _validatePhone(value) {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length < 8 || cleaned.length > 15) {
      return { valid: false, error: 'Phone must be 8-15 digits', cleaned: null };
    }
    return { valid: true, error: null, cleaned };
  }

  static _validateBankAccount(value) {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
    const numeric = cleaned.replace(/[^0-9]/g, '');
    if (numeric.length < 5 || numeric.length > 20) {
      return { valid: false, error: 'Account number must be 5-20 digits', cleaned: null };
    }
    return { valid: true, error: null, cleaned };
  }

  static _validateUrl(value) {
    try {
      new URL(value.startsWith('http') ? value : 'http://' + value);
      return { valid: true, error: null, cleaned: value };
    } catch {
      return { valid: false, error: 'Invalid URL format', cleaned: null };
    }
  }

  static _validateDomain(value) {
    const cleaned = value.toLowerCase().trim();
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(cleaned.replace(/^www\./, ''))) {
      return { valid: false, error: 'Invalid domain format', cleaned: null };
    }
    return { valid: true, error: null, cleaned };
  }

  static _validateTelegram(value) {
    const cleaned = value.replace(/[@\s]/g, '');
    if (cleaned.length < 3 || cleaned.length > 32) {
      return { valid: false, error: 'Telegram username must be 3-32 characters', cleaned: null };
    }
    return { valid: true, error: null, cleaned };
  }

  static _validateEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { valid: false, error: 'Invalid email format', cleaned: null };
    }
    return { valid: true, error: null, cleaned: value.toLowerCase() };
  }

  static _validateNik(value) {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length !== 16) {
      return { valid: false, error: 'NIK must be exactly 16 digits', cleaned: null };
    }
    return { valid: true, error: null, cleaned };
  }

  static _validateNpwp(value) {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length !== 15) {
      return { valid: false, error: 'NPWP must be exactly 15 digits', cleaned: null };
    }
    return { valid: true, error: null, cleaned };
  }
}

module.exports = EvidenceValidator;