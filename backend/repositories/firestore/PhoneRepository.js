// repositories/firestore/PhoneRepository.js
const { getFirestore } = require('firebase-admin/firestore');

let db;
function getDb() {
  try {
    if (!db) db = getFirestore();
    return db;
  } catch (err) {
    return null;
  }
}

class PhoneRepository {
  static async findByHash(phoneHash) {
    const db = getDb();
    if (!db) {
      // In dev mode without Firebase, return a safe fallback object (to keep checks running)
      return null;
    }

    try {
      const doc = await db.collection('phone_profiles').doc(phoneHash).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        phoneHash: doc.id,
        riskScore: data.risk_score || 0,
        reportsCount: data.reports_count || 0,
        category: data.category || null,
        signals: data.signals || [],
        lastActivity: data.last_activity ? (data.last_activity.toDate ? data.last_activity.toDate() : data.last_activity) : null,
        firstReported: data.first_reported ? (data.first_reported.toDate ? data.first_reported.toDate() : data.first_reported) : null,
        trend7d: data.trend_7d || 0,
        isConfirmedFraud: data.is_confirmed_fraud || false,
      };
    } catch (err) {
      console.error('Firestore PhoneRepository.findByHash error:', err);
      throw err;
    }
  }

  static async upsert(phoneHash, phoneData) {
    const db = getDb();
    if (!db) return;

    try {
      const docRef = db.collection('phone_profiles').doc(phoneHash);
      const data = {
        reports_count: phoneData.reportsCount !== undefined ? phoneData.reportsCount : 0,
        last_activity: phoneData.lastActivity || new Date(),
        risk_score: phoneData.riskScore !== undefined ? phoneData.riskScore : 0,
        category: phoneData.category || null,
      };
      await docRef.set(data, { merge: true });
    } catch (err) {
      console.error('Firestore PhoneRepository.upsert error:', err);
      throw err;
    }
  }
}

module.exports = PhoneRepository;
