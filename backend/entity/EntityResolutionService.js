// entity/EntityResolutionService.js
/**
 * EntityResolutionService — ARGUS v1.2
 *
 * Resolves and normalizes Indonesian entity types:
 * phone, bank account, virtual account, NIK (masked), NPWP (masked),
 * email, domain, IP, merchant, e-wallet.
 *
 * Supports fuzzy matching for near-duplicate detection.
 */

const PhoneNormalizer = require('../normalizers/phoneNormalizer');
const BankNormalizer = require('../normalizers/bankNormalizer');
const EwalletNormalizer = require('../normalizers/ewalletNormalizer');

class EntityResolutionService {
  constructor() {
    this._phoneNorm = new PhoneNormalizer();
    this._bankNorm = new BankNormalizer();
    this._ewalletNorm = new EwalletNormalizer();
  }

  /**
   * Resolve and normalize any entity value by type.
   */
  resolve(type, value) {
    switch (type) {
      case 'phone': return this.resolvePhone(value);
      case 'bank_account': return this.resolveBankAccount(value);
      case 'virtual_account': return this.resolveVirtualAccount(value);
      case 'nik': return this.resolveNik(value);
      case 'npwp': return this.resolveNpwp(value);
      case 'email': return this.resolveEmail(value);
      case 'domain': return this.resolveDomain(value);
      case 'ip': return this.resolveIp(value);
      case 'merchant': return this.resolveMerchant(value);
      case 'ewallet': return this.resolveEwallet(value);
      default: return { normalized: value.toLowerCase().trim(), valid: true };
    }
  }

  resolvePhone(value) {
    try {
      const normalized = this._phoneNorm.normalize(value);
      const cleaned = value.replace(/[^0-9]/g, '');
      const valid = cleaned.length >= 8 && cleaned.length <= 15;
      const prefix = cleaned.substring(0, 2);
      const operator = this._identifyOperator(cleaned);
      return {
        normalized,
        cleaned: cleaned,
        valid,
        countryCode: '62',
        localNumber: cleaned.startsWith('62') ? cleaned.substring(2) : cleaned,
        operator,
        provider: prefix === '62' ? 'telkomsel' : 'unknown',
        mask: cleaned.length >= 8
          ? cleaned.substring(0, 4) + '****' + cleaned.substring(cleaned.length - 2)
          : cleaned,
      };
    } catch {
      return { normalized: value, valid: false, error: 'Invalid phone' };
    }
  }

  resolveBankAccount(value) {
    try {
      const normalized = this._bankNorm.normalize(value);
      const match = normalized.match(/^([A-Z]+)(\d+)$/);
      return {
        normalized,
        bankCode: match ? match[1] : null,
        accountNumber: match ? match[2] : normalized,
        valid: match && match[2].length >= 5,
        mask: match ? match[1] + '****' + match[2].substring(match[2].length - 4) : normalized,
      };
    } catch {
      return { normalized: value, valid: false };
    }
  }

  resolveVirtualAccount(value) {
    const cleaned = value.replace(/[^0-9]/g, '');
    const valid = cleaned.length >= 10 && cleaned.length <= 20;
    return {
      normalized: cleaned,
      valid,
      length: cleaned.length,
      mask: cleaned.length >= 8 ? cleaned.substring(0, 4) + '****' + cleaned.substring(cleaned.length - 4) : cleaned,
    };
  }

  resolveNik(value) {
    const cleaned = value.replace(/[^0-9]/g, '');
    const valid = cleaned.length === 16;
    return {
      normalized: cleaned,
      valid,
      mask: valid ? cleaned.substring(0, 6) + '**********' : cleaned,
      birthDate: valid ? this._extractNikBirthDate(cleaned) : null,
      gender: valid ? (parseInt(cleaned[6]) > 4 ? 'female' : 'male') : null,
    };
  }

  resolveNpwp(value) {
    const cleaned = value.replace(/[^0-9]/g, '');
    const valid = cleaned.length === 15;
    return {
      normalized: cleaned,
      valid,
      mask: valid ? cleaned.substring(0, 2) + '***********' + cleaned.substring(cleaned.length - 3) : cleaned,
    };
  }

  resolveEmail(value) {
    const cleaned = value.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      normalized: cleaned,
      valid: emailRegex.test(cleaned),
      domain: cleaned.includes('@') ? cleaned.split('@')[1] : null,
    };
  }

  resolveDomain(value) {
    let cleaned = value.toLowerCase().trim().replace(/^(https?:\/\/)?/, '').replace(/^www\./, '').split('/')[0];
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
    return { normalized: cleaned, valid: domainRegex.test(cleaned) };
  }

  resolveIp(value) {
    const cleaned = value.trim();
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const valid = ipRegex.test(cleaned) && cleaned.split('.').every(o => parseInt(o) <= 255);
    return { normalized: cleaned, valid };
  }

  resolveMerchant(value) {
    const cleaned = value.trim();
    return { normalized: cleaned.toLowerCase(), valid: cleaned.length >= 2 };
  }

  resolveEwallet(value) {
    try {
      const normalized = this._ewalletNorm.normalize(value);
      const parts = normalized.split(':');
      return {
        normalized,
        provider: parts[0] || null,
        identifier: parts[1] || normalized,
        valid: normalized.length >= 3,
      };
    } catch {
      return { normalized: value, valid: false };
    }
  }

  _identifyOperator(phone) {
    const local = phone.startsWith('62') ? phone.substring(2) : phone;
    const prefixes = {
      telkomsel: ['0811', '0812', '0813', '0821', '0822', '0823', '0852', '0853', '0851'],
      indosat: ['0814', '0815', '0816', '0855', '0856', '0857', '0858'],
      xl: ['0817', '0818', '0819', '0859', '0877', '0878', '0879'],
      tri: ['0895', '0896', '0897', '0898', '0899'],
      smartfren: ['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'],
      byru: ['0859'],
    };
    for (const [op, prefs] of Object.entries(prefixes)) {
      if (prefs.some(p => local.startsWith(p))) return op;
    }
    return 'unknown';
  }

  _extractNikBirthDate(nik) {
    const day = parseInt(nik.substring(6, 8));
    const month = parseInt(nik.substring(8, 10));
    const year = parseInt(nik.substring(10, 12));
    const actualDay = day > 40 ? day - 40 : day; // Female adjustment
    return `${actualDay.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year < 25 ? '20' : '19'}${year.toString().padStart(2, '0')}`;
  }
}

module.exports = new EntityResolutionService();