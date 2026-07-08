// repositories/firestore/UrlRepository.js
const { getFirestore } = require('firebase-admin/firestore');

let db;
function getDb() {
  try { if (!db) db = getFirestore(); return db; }
  catch (err) { return null; }
}

class UrlRepository {
  static async findByDomain(domain) {
    const db = getDb();
    if (!db) return null;
    try {
      const snap = await db.collection('url_profiles')
        .where('domain', '==', domain.toLowerCase()).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0]; const d = doc.data();
      return {
        id: doc.id, domain: d.domain, urlHash: d.url_hash,
        riskScore: d.risk_score || 0, isPhishing: d.is_phishing || false,
        isMalware: d.is_malware || false,
        registeredAt: d.registered_at?.toDate?.()?.toISOString?.() || d.registered_at || null,
        country: d.country || null,
        reportsCount: d.reports_count || 0,
        firstSeen: d.first_seen?.toDate?.()?.toISOString?.() || d.first_seen || null,
        lastChecked: d.last_checked?.toDate?.()?.toISOString?.() || d.last_checked || null,
      };
    } catch (err) {
      console.error('Firestore UrlRepository.findByDomain error:', err);
      throw err;
    }
  }

  static async upsert(urlHash, domain, urlData) {
    const db = getDb();
    if (!db) return;
    try {
      const snap = await db.collection('url_profiles')
        .where('domain', '==', domain.toLowerCase()).limit(1).get();
      const data = {
        domain: domain.toLowerCase(), url_hash: urlHash,
        risk_score: urlData.riskScore || 0,
        is_phishing: urlData.isPhishing || false,
        is_malware: urlData.isMalware || false,
        reports_count: urlData.reportsCount || 0,
        last_checked: new Date(),
      };
      if (snap.empty) {
        data.first_seen = new Date();
        await db.collection('url_profiles').add(data);
      } else {
        await db.collection('url_profiles').doc(snap.docs[0].id).set(data, { merge: true });
      }
    } catch (err) {
      console.error('Firestore UrlRepository.upsert error:', err);
      throw err;
    }
  }

  static async search(criteria = {}) {
    const db = getDb();
    if (!db) return { data: [], total: 0 };
    try {
      const { isPhishing, isMalware, riskScoreMin, limit = 20, offset = 0 } = criteria;
      let query = db.collection('url_profiles');
      if (isPhishing !== undefined) query = query.where('is_phishing', '==', isPhishing);
      if (isMalware !== undefined) query = query.where('is_malware', '==', isMalware);
      if (riskScoreMin !== undefined) query = query.where('risk_score', '>=', riskScoreMin);
      query = query.orderBy('risk_score', 'desc').limit(limit).offset(offset);
      const snap = await query.get();
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id, domain: d.domain, urlHash: d.url_hash,
          riskScore: d.risk_score || 0, isPhishing: d.is_phishing || false,
          isMalware: d.is_malware || false,
          registeredAt: d.registered_at?.toDate?.()?.toISOString?.() || d.registered_at || null,
          country: d.country, reportsCount: d.reports_count || 0,
          firstSeen: d.first_seen?.toDate?.()?.toISOString?.() || d.first_seen || null,
          lastChecked: d.last_checked?.toDate?.()?.toISOString?.() || d.last_checked || null,
        };
      });
      return { data, total: data.length };
    } catch (err) {
      console.error('Firestore UrlRepository.search error:', err);
      return { data: [], total: 0 };
    }
  }

  static async ping() {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await db.collection('url_profiles').limit(1).get();
  }
}

module.exports = UrlRepository;
