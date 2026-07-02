// normalizers/bankNormalizer.js

/**
 * Normalizes bank account identifiers.
 * Rules (Indonesia specific, can be extended):
 *   - Remove any non‑alphanumeric characters (spaces, dashes, underscores).
 *   - Upper‑case the bank code prefix if present (e.g., "bca" → "BCA").
 *   - Preserve numeric part as‑is.
 * Expected format after normalization: BANKCODE1234567890 (no separator).
 */
class BankNormalizer {
  normalize(value) {
    if (typeof value !== 'string') throw new Error('Bank account value must be a string');
    // Remove spaces, dashes, underscores, and other separators
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
    // Separate alphabetic prefix (bank code) from numeric part
    const match = cleaned.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) {
      // If pattern does not match, just return upper‑cased cleaned string
      return cleaned.toUpperCase();
    }
    const [, bankCode, numbers] = match;
    return bankCode.toUpperCase() + numbers;
  }
}

module.exports = BankNormalizer;
