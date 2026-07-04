// repositories/postgres/UrlRepository.js
const db = require('../../utils/db');

class UrlRepository {
  static async findByDomain(domain) {
    try {
      const query = 'SELECT * FROM url_profiles WHERE domain = $1';
      const { rows } = await db.query(query, [domain.toLowerCase()]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        domain: row.domain,
        urlHash: row.url_hash,
        riskScore: row.risk_score,
        isPhishing: row.is_phishing,
        isMalware: row.is_malware,
        registeredAt: row.registered_at,
        country: row.country,
        reportsCount: row.reports_count,
        firstSeen: row.first_seen,
        lastChecked: row.last_checked,
      };
    } catch (err) {
      console.error('Postgres UrlRepository.findByDomain error:', err);
      throw err;
    }
  }

  static async upsert(urlHash, domain, urlData) {
    try {
      const query = `
        INSERT INTO url_profiles (domain, url_hash, risk_score, is_phishing, is_malware, reports_count, first_seen, last_checked)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (domain) DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          is_phishing = EXCLUDED.is_phishing,
          is_malware = EXCLUDED.is_malware,
          reports_count = EXCLUDED.reports_count,
          last_checked = NOW()
      `;
      await db.query(query, [
        domain.toLowerCase(),
        urlHash,
        urlData.riskScore || 0,
        urlData.isPhishing || false,
        urlData.isMalware || false,
        urlData.reportsCount || 0,
      ]);
    } catch (err) {
      console.error('Postgres UrlRepository.upsert error:', err);
      throw err;
    }
  }
}

module.exports = UrlRepository;
