// partners/PartnerRegistry.js
/**
 * PartnerRegistry — ARGUS v1.3
 *
 * Manages partner integrations: banks, fintech, insurance, marketplace, e-wallet, government.
 * Each partner gets API keys, rate limits, webhooks, and analytics.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

const PARTNER_TYPES = ['bank', 'fintech', 'insurance', 'marketplace', 'ewallet', 'government', 'media'];

class PartnerRegistry {
  static async register(params) {
    const { name, type, contactEmail, webhookUrl, metadata } = params;
    if (!PARTNER_TYPES.includes(type)) throw new Error(`Invalid partner type: ${type}`);

    const partnerId = uuidv4();
    const apiKey = `arg_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
    const apiSecret = uuidv4().replace(/-/g, '').substring(0, 32);

    const query = `
      INSERT INTO partners (id, name, type, api_key, api_secret, contact_email, webhook_url,
        status, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW())
      RETURNING id, name, type, api_key, status, created_at
    `;
    const result = await db.query(query, [partnerId, name, type, apiKey, apiSecret, contactEmail, webhookUrl, JSON.stringify(metadata || {})]);
    return result.rows[0];
  }

  static async authenticate(apiKey) {
    const result = await db.query(
      "SELECT * FROM partners WHERE api_key = $1 AND status = 'active'", [apiKey]
    );
    if (result.rows.length === 0) return null;
    const p = result.rows[0];
    return { partnerId: p.id, name: p.name, type: p.type, rateLimit: p.rate_limit || 100 };
  }

  static async list() {
    const result = await db.query('SELECT id, name, type, status, created_at FROM partners ORDER BY created_at DESC');
    return result.rows;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL, api_key VARCHAR(64) UNIQUE NOT NULL,
        api_secret VARCHAR(64) NOT NULL, contact_email VARCHAR(255),
        webhook_url TEXT, rate_limit INT DEFAULT 100,
        status VARCHAR(16) DEFAULT 'active',
        metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_partners_api_key ON partners(api_key);
      CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
    `);
  }
}

module.exports = PartnerRegistry;