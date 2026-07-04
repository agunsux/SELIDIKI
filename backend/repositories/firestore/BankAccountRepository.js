// repositories/firestore/BankAccountRepository.js
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

class BankAccountRepository {
  static async findByHashAndBank(accountHash, bankCode) {
    const db = getDb();
    if (!db) return null;

    try {
      const docId = `${bankCode}_${accountHash}`;
      const doc = await db.collection('account_profiles').doc(docId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        accountHash,
        bankCode,
        riskScore: data.risk_score || 0,
        reportsCount: data.reports_count || 0,
        categories: data.categories || [],
        lastActivity: data.last_activity ? (data.last_activity.toDate ? data.last_activity.toDate() : data.last_activity) : null,
        firstReported: data.first_reported ? (data.first_reported.toDate ? data.first_reported.toDate() : data.first_reported) : null,
        isBlocked: data.is_blocked || false,
      };
    } catch (err) {
      console.error('Firestore BankAccountRepository.findByHashAndBank error:', err);
      throw err;
    }
  }

  static async upsert(accountHash, bankCode, accountData) {
    const db = getDb();
    if (!db) return;

    try {
      const docId = `${bankCode}_${accountHash}`;
      const docRef = db.collection('account_profiles').doc(docId);
      const data = {
        reports_count: accountData.reportsCount !== undefined ? accountData.reportsCount : 0,
        last_activity: accountData.lastActivity || new Date(),
        risk_score: accountData.riskScore !== undefined ? accountData.riskScore : 0,
        categories: accountData.categories || [],
      };
      await docRef.set(data, { merge: true });
    } catch (err) {
      console.error('Firestore BankAccountRepository.upsert error:', err);
      throw err;
    }
  }
}

module.exports = BankAccountRepository;
