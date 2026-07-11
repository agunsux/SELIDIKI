// providers/adapters/GoogleSafeBrowsingAdapter.js
/**
 * GoogleSafeBrowsingAdapter — ARGUS v1.1
 *
 * Adapter for Google Safe Browsing API.
 * Implements ProviderInterface: initialize(), lookup(), health(), shutdown()
 */

const { STATUS } = require('../../runtime/DependencyChecker');

class GoogleSafeBrowsingAdapter {
  constructor() {
    this._apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
    this._baseUrl = 'https://safebrowsing.googleapis.com/v4';
    this._initialized = false;
  }

  async initialize() {
    if (!this._apiKey) {
      throw new Error('GOOGLE_SAFE_BROWSING_KEY not configured');
    }
    this._initialized = true;
  }

  async lookup(query) {
    if (!this._initialized) throw new Error('Provider not initialized');

    const { url } = query;
    if (!url) throw new Error('URL is required for lookup');

    const response = await fetch(`${this._baseUrl}/threatMatches:find?key=${this._apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'argus', clientVersion: '1.1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Safe Browsing API error: ${response.status}`);
    }

    const data = await response.json();
    const matches = data.matches || [];

    return {
      safe: matches.length === 0,
      threats: matches.map(m => ({
        type: m.threatType,
        platform: m.platformType,
        threat: m.threat?.url,
      })),
      matchCount: matches.length,
    };
  }

  async health() {
    try {
      const response = await fetch(`${this._baseUrl}/threatLists?key=${this._apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async shutdown() {
    this._initialized = false;
  }
}

module.exports = GoogleSafeBrowsingAdapter;