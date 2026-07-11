// evidence/EvidenceHasher.js
/**
 * EvidenceHasher — ARGUS v1.2
 *
 * Creates deterministic hashes for evidence values.
 * Hash = SHA256(type + ":" + normalized_value)
 */

const crypto = require('crypto');

class EvidenceHasher {
  /**
   * Generate a deterministic hash for an evidence item.
   * @param {string} type - Evidence type
   * @param {string} value - Raw or normalized value
   * @param {boolean} [normalize=true] - Normalize before hashing
   * @returns {string} Hex SHA-256 hash
   */
  static hash(type, value, normalize = true) {
    let normalized = value;
    if (normalize) {
      const EvidenceNormalizer = require('./EvidenceNormalizer');
      normalized = EvidenceNormalizer.normalize(type, value);
    }
    const payload = `${type}:${normalized}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Verify that a value matches a given hash.
   */
  static verify(type, value, expectedHash) {
    const computed = this.hash(type, value);
    return computed === expectedHash;
  }

  /**
   * Generate a short display hash (first 12 chars).
   */
  static shortHash(type, value) {
    return this.hash(type, value).substring(0, 12);
  }
}

module.exports = EvidenceHasher;