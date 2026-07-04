// repositories/firestore/ReportRepository.js
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

class ReportRepository {
  static async insert(reportData) {
    const db = getDb();
    if (!db) return reportData;

    try {
      const batch = db.batch();

      // Add report
      const reportRef = db.collection('fraud_reports').doc(reportData.trackingId);
      batch.set(reportRef, {
        tracking_id: reportData.trackingId,
        target_type: reportData.targetType,
        target_hash: reportData.targetHash,
        category: reportData.category,
        description: reportData.description || null,
        evidence_url: reportData.evidenceUrl || null,
        reporter_hash: reportData.reporterHash || null,
        confidence: reportData.confidence || 50,
        created_at: new Date(),
        verified: false,
      });

      // Update target profile risk score (Firestore flow: +5 increment)
      const profileCollection =
        reportData.targetType === 'account' ? 'account_profiles' : 'phone_profiles';
      
      const docId = reportData.targetType === 'account' ? reportData.targetHash : reportData.targetHash;
      const profileRef = db.collection(profileCollection).doc(docId);
      
      batch.set(
        profileRef,
        {
          reports_count: require('firebase-admin/firestore').FieldValue.increment(1),
          last_activity: new Date(),
          risk_score: require('firebase-admin/firestore').FieldValue.increment(5),
        },
        { merge: true }
      );

      await batch.commit();
      return reportData;
    } catch (err) {
      console.error('Firestore ReportRepository.insert error:', err);
      throw err;
    }
  }

  static async findTrending({ limit = 10, category }) {
    const db = getDb();
    if (!db) return [];

    try {
      let query = db
        .collection('fraud_reports')
        .where('verified', '==', true)
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (category) {
        query = query.where('category', '==', category);
      }

      const snap = await query.get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          trackingId: data.tracking_id || doc.id,
          targetType: data.target_type,
          targetHash: data.target_hash,
          category: data.category,
          description: data.description,
          evidenceUrl: data.evidence_url,
          reporterHash: data.reporter_hash,
          confidence: data.confidence,
          createdAt: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          verified: data.verified,
        };
      });
    } catch (err) {
      console.error('Firestore ReportRepository.findTrending error:', err);
      return [];
    }
  }
}

module.exports = ReportRepository;
