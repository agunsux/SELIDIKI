// repositories/firestore/FraudReportRepository.js
const { getFirestore } = require('firebase-admin/firestore');

let db;
function getDb() {
  try { if (!db) db = getFirestore(); return db; }
  catch (err) { return null; }
}

class FraudReportRepository {
  static async findByEntityId(entityIdOrHash) {
    const db = getDb();
    if (!db) return [];
    try {
      // Search by target_hash matching the entity hash or ID
      const snap = await db.collection('fraud_reports')
        .where('target_hash', '==', entityIdOrHash)
        .orderBy('created_at', 'desc').get();
      return snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id, fraudEntityId: d.target_hash, reporterId: d.reporter_hash,
          trusted: false, falsePositive: d.verified === false, source: 'community',
          category: d.category, confidence: d.confidence || 50,
          createdAt: d.created_at?.toDate?.()?.toISOString() || d.created_at,
        };
      });
    } catch (err) {
      console.error('Firestore FraudReportRepository.findByEntityId error:', err);
      throw err;
    }
  }

  static async findByTrackingId(trackingId) {
    const db = getDb();
    if (!db) return null;
    try {
      const snap = await db.collection('fraud_reports')
        .where('tracking_id', '==', trackingId).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0].data();
      return {
        id: snap.docs[0].id, fraudEntityId: d.target_hash, reporterId: d.reporter_hash,
        trusted: false, falsePositive: d.verified === false, source: 'community',
        category: d.category, confidence: d.confidence || 50,
        createdAt: d.created_at?.toDate?.()?.toISOString() || d.created_at,
      };
    } catch (err) {
      console.error('Firestore FraudReportRepository.findByTrackingId error:', err);
      throw err;
    }
  }

  static async search(criteria = {}) {
    const db = getDb();
    if (!db) return { data: [], total: 0 };
    try {
      const { targetHash, targetType, category, status, reporterHash, limit = 20, offset = 0 } = criteria;
      let query = db.collection('fraud_reports');
      if (targetHash) query = query.where('target_hash', '==', targetHash);
      if (targetType) query = query.where('target_type', '==', targetType);
      if (category) query = query.where('category', '==', category);
      if (status === 'verified') query = query.where('verified', '==', true);
      else if (status === 'pending') query = query.where('verified', '==', false);
      if (reporterHash) query = query.where('reporter_hash', '==', reporterHash);
      query = query.orderBy('created_at', 'desc').limit(limit).offset(offset);
      const snap = await query.get();
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id, fraudEntityId: d.target_hash, reporterId: d.reporter_hash,
          trusted: false, falsePositive: d.verified === false, source: 'community',
          category: d.category, confidence: d.confidence || 50,
          createdAt: d.created_at?.toDate?.()?.toISOString() || d.created_at,
        };
      });
      return { data, total: data.length };
    } catch (err) {
      console.error('Firestore FraudReportRepository.search error:', err);
      return { data: [], total: 0 };
    }
  }

  static async ping() {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await db.collection('fraud_reports').limit(1).get();
  }
}

module.exports = FraudReportRepository;
