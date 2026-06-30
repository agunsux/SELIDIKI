const { getFirestore } = require('firebase-admin/firestore');

let db;
function getDb() {
  try {
    if (!db) db = getFirestore();
    return db;
  } catch {
    return null;
  }
}

/**
 * Save scan to user history
 */
async function saveToHistory({ userHash, inputType, riskScore, result }) {
  const db = getDb();
  if (!db) return; // Firebase not initialized in dev

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
    // Non-critical — don't fail the scan if history save fails
    console.warn('saveToHistory: failed (non-critical):', err.message);
  }
}

module.exports = { saveToHistory };
