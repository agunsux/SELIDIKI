const { getFirestore } = require('firebase-admin/firestore');

let db;
function getDb() {
  if (!db) db = getFirestore();
  return db;
}

/**
 * Get phone reputation profile from Firestore
 */
async function getPhoneProfile(phoneHash) {
  try {
    const doc = await getDb().collection('phone_profiles').doc(phoneHash).get();

    if (!doc.exists) {
      return {
        risk_score: 0,
        reports_count: 0,
        category: null,
        signals: [],
        last_activity: null,
        first_reported: null,
      };
    }

    return doc.data();
  } catch (err) {
    console.error('getPhoneProfile error:', err);
    return { risk_score: 0, reports_count: 0, category: null, signals: [] };
  }
}

/**
 * Get bank account risk profile from Firestore
 */
async function getAccountProfile(accountHash, bankCode) {
  try {
    const docId = `${bankCode}_${accountHash}`;
    const doc = await getDb().collection('account_profiles').doc(docId).get();

    if (!doc.exists) {
      return { risk_score: 0, reports_count: 0, categories: [] };
    }

    return doc.data();
  } catch (err) {
    console.error('getAccountProfile error:', err);
    return { risk_score: 0, reports_count: 0, categories: [] };
  }
}

/**
 * Create a fraud report and update target profile
 */
async function createFraudReport(reportData) {
  const db = getDb();
  const batch = db.batch();

  // Add report
  const reportRef = db.collection('fraud_reports').doc(reportData.trackingId);
  batch.set(reportRef, {
    ...reportData,
    created_at: new Date(),
    verified: false,
  });

  // Update target profile risk score
  const profileCollection =
    reportData.targetType === 'account' ? 'account_profiles' : 'phone_profiles';

  const profileRef = db.collection(profileCollection).doc(reportData.targetHash);
  batch.set(
    profileRef,
    {
      reports_count: require('firebase-admin/firestore').FieldValue.increment(1),
      last_activity: new Date(),
      risk_score: require('firebase-admin/firestore').FieldValue.increment(5), // Will be recalculated
    },
    { merge: true }
  );

  await batch.commit();
  return reportData;
}

/**
 * Get trending fraud reports
 */
async function getTrendingReports({ limit = 10, category }) {
  try {
    let query = getDb()
      .collection('fraud_reports')
      .where('verified', '==', true)
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (category) {
      query = query.where('category', '==', category);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString(),
    }));
  } catch (err) {
    console.error('getTrendingReports error:', err);
    return [];
  }
}

/**
 * Save history service stub
 */
async function saveToHistory({ userHash, inputType, riskScore, result }) {
  try {
    await getDb().collection('scan_history').add({
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
    console.error('saveToHistory error:', err);
  }
}

module.exports = { getPhoneProfile, getAccountProfile, createFraudReport, getTrendingReports };
