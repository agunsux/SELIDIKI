// trust/VerifiedOrganization.js
/**
 * VerifiedOrganization — ARGUS v1.3
 *
 * Manages verified organizations (businesses, government, financial institutions).
 * Organizations can claim profiles and get verified badges.
 */

const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

const ORG_TYPES = ['business', 'government', 'financial_institution', 'ngo', 'media'];

class VerifiedOrganization {
  static async register(params) {
    const { name, type, registrationNumber, domain, contactEmail, verifiedBy } = params;
    if (!ORG_TYPES.includes(type)) throw new Error(`Invalid org type: ${type}`);
    const id = uuidv4();

    const query = `
      INSERT INTO verified_organizations (id, name, type, registration_number, domain,
        contact_email, verified_by, verified_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'active')
      RETURNING *
    `;
    const result = await db.query(query, [id, name, type, registrationNumber, domain, contactEmail, verifiedBy]);
    return result.rows[0];
  }

  static async findByDomain(domain) {
    const result = await db.query(
      "SELECT * FROM verified_organizations WHERE domain = $1 AND status = 'active'", [domain]
    );
    return result.rows[0] || null;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS verified_organizations (
        id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL, registration_number VARCHAR(64),
        domain VARCHAR(255), contact_email VARCHAR(255),
        verified_by VARCHAR(128), verified_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(16) DEFAULT 'active'
      );
      CREATE INDEX IF NOT EXISTS idx_org_domain ON verified_organizations(domain);
      CREATE INDEX IF NOT EXISTS idx_org_type ON verified_organizations(type);
    `);
  }
}

module.exports = VerifiedOrganization;