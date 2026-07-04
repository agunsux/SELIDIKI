// normalizers/urlNormalizer.js

/**
 * Normalizes URL identifiers.
 * Rules:
 *   1. Trim whitespace.
 *   2. Ensure a valid URL protocol exists; if not, prepend 'http://' to allow URL parsing.
 *   3. Parse URL and extract lowercase hostname.
 *   4. Strip the 'www.' prefix if present.
 *   5. Return the normalized hostname.
 */
class UrlNormalizer {
  normalize(value) {
    if (typeof value !== 'string') {
      throw new Error('URL value must be a string');
    }
    
    let trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('URL value cannot be empty');
    }

    // Prepend protocol if missing to enable standard URL parsing
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'http://' + trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      let hostname = parsed.hostname.toLowerCase();
      
      // Strip www. prefix
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      
      return hostname;
    } catch (err) {
      throw new Error(`Invalid URL format: ${err.message}`);
    }
  }
}

module.exports = UrlNormalizer;
