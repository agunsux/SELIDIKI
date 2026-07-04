// repositories/firestore/HistoryRepository.js
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

class HistoryRepository {
  static async insert({ userHash, inputType, riskScore, result }) {
    const db = getDb();
    if (!db) return;

    try {
      await db.collection('scan_history').add({
        user_hash: userHash,
        input_type: inputType,
        risk_score: riskScore,
        result_summary: {
          status: result.status,
          category: result.category,
        },
        created_at: new Date(),
      });
    } catch (err) {
      console.warn('Firestore HistoryRepository.insert failed (non-critical):', err.message);
    }
  }

  static async findByUserHash(userHash, limit = 20, offset = 0) {
    const db = getDb();
    if (!db) return { data: [], total: 0 };

    try {
      const snap = await db
        .collection('scan_history')
        .where('user_hash', '==', userHash)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();

      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          userHash: d.user_hash,
          inputType: d.input_type,
          riskScore: d.risk_score,
          result: d.result_summary,
          createdAt: d.created_at?.toDate?.()?.toISOString() || d.created_at
        };
      });

      return {
        data,
        total: data.length
      };
    } catch (err) {
      console.error('Firestore HistoryRepository.findByUserHash error:', err);
      return { data: [], total: 0 };
    }
  }
}

module.exports = HistoryRepository;
