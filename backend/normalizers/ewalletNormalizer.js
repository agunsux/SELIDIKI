// normalizers/ewalletNormalizer.js

/**
 * Normalizes e‑wallet identifiers.
 * Expected input examples:
 *   - "0812‑3456‑789" (phone based)
 *   - "GOPAY:08123456789"
 *   - "OVO-12345"
 * Rules:
 *   1. Trim whitespace.
 *   2. Upper‑case provider name if present before a ':' or '-'.
 *   3. Remove all non‑alphanumeric characters from the identifier part.
 *   4. Return as PROVIDER:IDENTIFIER (e.g., "GOPAY:08123456789").
 */
class EwalletNormalizer {
  normalize(value) {
    if (typeof value !== 'string') throw new Error('E‑wallet value must be a string');
    const trimmed = value.trim();
    // Split provider and id using ':' or '-'
    const parts = trimmed.split(/[:\-]/);
    if (parts.length < 2) {
      // No explicit provider, just clean alphanumerics and uppercase whole string
      return trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    const provider = parts[0].toUpperCase();
    const identifier = parts.slice(1).join('').replace(/[^a-zA-Z0-9]/g, '');
    return `${provider}:${identifier}`;
  }
}

module.exports = EwalletNormalizer;
