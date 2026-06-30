const crypto = require('crypto');

const SALT = process.env.HASH_SALT || 'selidiki_default_salt_change_in_production';

/**
 * Hash any input with SHA-256 + salt
 */
function hashInput(input) {
  return crypto
    .createHash('sha256')
    .update(SALT + input.toLowerCase().trim())
    .digest('hex');
}

/**
 * Hash phone number (normalize first)
 */
function hashPhone(phoneNumber) {
  const normalized = phoneNumber.replace(/[^0-9]/g, '');
  return hashInput('phone:' + normalized);
}

/**
 * Hash bank account (include bank code for uniqueness)
 */
function hashAccount(accountNumber, bankCode) {
  const normalized = accountNumber.replace(/[^0-9]/g, '');
  return hashInput(`account:${bankCode.toUpperCase()}:${normalized}`);
}

module.exports = { hashInput, hashPhone, hashAccount };
