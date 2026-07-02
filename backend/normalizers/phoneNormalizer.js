// normalizers/phoneNormalizer.js

/**
 * Normalizes phone numbers to E.164 format for Indonesia (+62).
 * Steps:
 *   1. Remove spaces, hyphens, parentheses.
 *   2. If the number starts with '0', replace it with '+62'.
 *   3. Ensure it starts with '+'; if not, prepend '+'.
 *   4. Return the cleaned string.
 */
class PhoneNormalizer {
  normalize(value) {
    if (typeof value !== 'string') throw new Error('Phone value must be a string');
    // Remove spaces, hyphens, parentheses
    let cleaned = value.replace(/[\s\-\(\)]/g, '');
    // Convert leading 0 to +62
    if (cleaned.startsWith('0')) {
      cleaned = '+62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      // Assume already international without leading 0, just prepend '+'
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }
}

module.exports = PhoneNormalizer;
