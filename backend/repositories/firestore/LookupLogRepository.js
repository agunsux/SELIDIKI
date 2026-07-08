// repositories/firestore/LookupLogRepository.js
const { getFirestore } = require('firebase-admin/firestore');

let db;
function getDb() {
  try { if (!db) db = getFirestore(); return db; }
  catch (err) { return null; }
}

class LookupLogRepository {
  static async insert({ queryId, entityType, hash, cacheHit, riskScore }) {
    const db = getDb();
    if (!db) return;
    try {
      await db.collection('audit_log').add({
        action: 'REPUTATION_CHECK',
        target_id: hash,
        target_type: entityType,
        metadata: { queryId, cacheHit, riskScore },
        created_at: new Date(),
      });
    } catch (err) {
      console.warn('Firestore LookupLogRepository.insert failed (non-critical):', err.message);
    }
  }

  static async search(criteria = {}) {
    const db = getDb();
    if (!db) return { data: [], total: 0 };
    try {
      const { entityType, hash, startDate, endDate, limit = 20, offset = 0 } = criteria;
      let query = db.collection('audit_log').where('action', '==', 'REPUTATION_CHECK');
      if (entityType) query = query.where('target_type', '==', entityType);
      if (hash) query = query.where('target_id', '==', hash);
      query = query.orderBy('created_at', 'desc').limit(limit).offset(offset);
      const snap = await query.get();
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, ...d.metadata, entityType: d.target_type, hash: d.target_id, createdAt: d.created_at?.toDate?.()?.toISOString() || d.created_at };
      });
      return { data, total: data.length };
    } catch (err) {
      console.error('Firestore LookupLogRepository.search error:', err);
      return { data: [], total: 0 };
    }
  }

  static async ping() {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await db.collection('audit_log').limit(1).get();
  }
}

module.exports = LookupLogRepository;
