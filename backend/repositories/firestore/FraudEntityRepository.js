// repositories/firestore/FraudEntityRepository.js
const { getFirestore } = require('firebase-admin/firestore');

let db;
function getDb() {
  try { if (!db) db = getFirestore(); return db; }
  catch (err) { return null; }
}

class FraudEntityRepository {
  static async findByHash(hash) {
    const db = getDb();
    if (!db) return null;
    try {
      // Check phone_profiles
      const phoneDoc = await db.collection('phone_profiles').doc(hash).get();
      if (phoneDoc.exists) {
        const d = phoneDoc.data();
        return {
          id: phoneDoc.id, entityType: 'phone', normalizedValue: '',
          valueHash: phoneDoc.id, riskScore: d.risk_score || 0,
          createdAt: d.first_reported?.toDate?.()?.toISOString?.() || d.first_reported || null,
          updatedAt: d.last_activity?.toDate?.()?.toISOString?.() || d.last_activity || null,
        };
      }
      // Check account_profiles (doc ID = bankCode_accountHash)
      const accountSnap = await db.collection('account_profiles')
        .where('account_hash', '==', hash).limit(1).get();
      if (!accountSnap.empty) {
        const doc = accountSnap.docs[0]; const d = doc.data();
        return {
          id: doc.id, entityType: 'account', normalizedValue: doc.id.split('_')[0] || '',
          valueHash: hash, riskScore: d.risk_score || 0,
          createdAt: d.first_reported?.toDate?.()?.toISOString?.() || d.first_reported || null,
          updatedAt: d.last_activity?.toDate?.()?.toISOString?.() || d.last_activity || null,
        };
      }
      return null;
    } catch (err) {
      console.error('Firestore FraudEntityRepository.findByHash error:', err);
      throw err;
    }
  }

  static async findById(id) {
    const db = getDb();
    if (!db) return null;
    try {
      // Try phone_profiles by UUID
      const phoneSnap = await db.collection('phone_profiles').where('id', '==', id).limit(1).get();
      if (!phoneSnap.empty) {
        const doc = phoneSnap.docs[0]; const d = doc.data();
        return { id: doc.id, entityType: 'phone', normalizedValue: '',
          valueHash: doc.id, riskScore: d.risk_score || 0,
          createdAt: d.first_reported?.toDate?.()?.toISOString?.() || null,
          updatedAt: d.last_activity?.toDate?.()?.toISOString?.() || null };
      }
      return null;
    } catch (err) {
      console.error('Firestore FraudEntityRepository.findById error:', err);
      throw err;
    }
  }

  static async search(criteria = {}) {
    const db = getDb();
    if (!db) return { data: [], total: 0 };
    try {
      const { riskScoreMin, limit = 20, offset = 0 } = criteria;
      let query = db.collection('phone_profiles');
      if (riskScoreMin !== undefined) query = query.where('risk_score', '>=', riskScoreMin);
      query = query.orderBy('risk_score', 'desc').limit(limit).offset(offset);
      const snap = await query.get();
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, entityType: 'phone', normalizedValue: '',
          valueHash: doc.id, riskScore: d.risk_score || 0,
          createdAt: d.first_reported?.toDate?.()?.toISOString?.() || null,
          updatedAt: d.last_activity?.toDate?.()?.toISOString?.() || null };
      });
      return { data, total: data.length };
    } catch (err) {
      console.error('Firestore FraudEntityRepository.search error:', err);
      return { data: [], total: 0 };
    }
  }

  static async ping() {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await db.collection('phone_profiles').limit(1).get();
  }
}

module.exports = FraudEntityRepository;
