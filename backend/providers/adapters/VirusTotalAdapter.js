// providers/adapters/VirusTotalAdapter.js
/**
 * VirusTotalAdapter — ARGUS v1.1
 *
 * Adapter for VirusTotal API.
 * Implements ProviderInterface: initialize(), lookup(), health(), shutdown()
 */

class VirusTotalAdapter {
  constructor() {
    this._apiKey = process.env.VIRUSTOTAL_API_KEY;
    this._baseUrl = 'https://www.virustotal.com/api/v3';
    this._initialized = false;
  }

  async initialize() {
    if (!this._apiKey) {
      throw new Error('VIRUSTOTAL_API_KEY not configured');
    }
    this._initialized = true;
  }

  async lookup(query) {
    if (!this._initialized) throw new Error('Provider not initialized');

    const { type = 'url', value } = query;
    if (!value) throw new Error('Value is required for lookup');

    let endpoint;
    if (type === 'url') {
      const urlId = Buffer.from(value).toString('base64').replace(/=/g, '');
      endpoint = `${this._baseUrl}/urls/${urlId}`;
    } else if (type === 'domain') {
      endpoint = `${this._baseUrl}/domains/${value}`;
    } else if (type === 'ip') {
      endpoint = `${this._baseUrl}/ip_addresses/${value}`;
    } else {
      throw new Error(`Unsupported lookup type: ${type}`);
    }

    const response = await fetch(endpoint, {
      headers: { 'x-apikey': this._apiKey },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { found: false, type, value };
      }
      throw new Error(`VirusTotal API error: ${response.status}`);
    }

    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};

    return {
      found: true,
      type,
      value,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      total: (stats.malicious || 0) + (stats.suspicious || 0) + (stats.harmless || 0) + (stats.undetected || 0),
      score: stats.malicious > 0 ? 'malicious' : stats.suspicious > 0 ? 'suspicious' : 'clean',
    };
  }

  async health() {
    try {
      const response = await fetch(`${this._baseUrl}/api/status`, {
        headers: { 'x-apikey': this._apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async shutdown() {
    this._initialized = false;
  }
}

module.exports = VirusTotalAdapter;