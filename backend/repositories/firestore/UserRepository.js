// repositories/firestore/UserRepository.js
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

class UserRepository {
  static async findByFirebaseUid(uid) {
    const db = getDb();
    if (!db) return null;

    try {
      const snap = await db.collection('users')
        .where('firebase_uid', '==', uid)
        .limit(1)
        .get();

      if (snap.empty) return null;

      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        phoneHash: data.phone_hash,
        firebaseUid: data.firebase_uid,
        role: data.role || 'user',
        createdAt: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        lastActive: data.last_active?.toDate?.()?.toISOString() || data.last_active,
        premiumUntil: data.premium_until?.toDate?.()?.toISOString() || data.premium_until,
        reportCount: data.report_count || 0,
        scanCount: data.scan_count || 0,
        isBanned: data.is_banned || false,
        banReason: data.ban_reason || null,
        metadata: data.metadata || {},
      };
    } catch (err) {
      console.error('Firestore UserRepository.findByFirebaseUid error:', err);
      throw err;
    }
  }

  static async findByHash(phoneHash) {
    const db = getDb();
    if (!db) return null;

    try {
      const snap = await db.collection('users')
        .where('phone_hash', '==', phoneHash)
        .limit(1)
        .get();

      if (snap.empty) return null;

      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        phoneHash: data.phone_hash,
        firebaseUid: data.firebase_uid || null,
        role: data.role || 'user',
        createdAt: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        lastActive: data.last_active?.toDate?.()?.toISOString() || data.last_active,
        premiumUntil: data.premium_until?.toDate?.()?.toISOString() || data.premium_until,
        reportCount: data.report_count || 0,
        scanCount: data.scan_count || 0,
        isBanned: data.is_banned || false,
        banReason: data.ban_reason || null,
        metadata: data.metadata || {},
      };
    } catch (err) {
      console.error('Firestore UserRepository.findByHash error:', err);
      throw err;
    }
  }

  static async insert(userRecord) {
    const db = getDb();
    if (!db) return userRecord;

    try {
      const docRef = db.collection('users').doc();
      const data = {
        phone_hash: userRecord.phoneHash,
        firebase_uid: userRecord.firebaseUid || null,
        created_at: new Date(),
        last_active: new Date(),
        role: userRecord.role || 'user',
        metadata: userRecord.metadata || {},
      };
      await docRef.set(data);

      return {
        id: docRef.id,
        phoneHash: userRecord.phoneHash,
        firebaseUid: userRecord.firebaseUid,
        role: userRecord.role || 'user',
        createdAt: data.created_at.toISOString(),
        lastActive: data.last_active.toISOString(),
        premiumUntil: null,
        reportCount: 0,
        scanCount: 0,
        isBanned: false,
        banReason: null,
        metadata: userRecord.metadata || {},
      };
    } catch (err) {
      console.error('Firestore UserRepository.insert error:', err);
      throw err;
    }
  }

  static async deleteByHash(phoneHash) {
    const db = getDb();
    if (!db) return false;

    try {
      const snap = await db.collection('users')
        .where('phone_hash', '==', phoneHash)
        .limit(1)
        .get();

      if (!snap.empty) {
        await db.collection('users').doc(snap.docs[0].id).delete();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Firestore UserRepository.deleteByHash error:', err);
      throw err;
    }
  }

  static async search(criteria = {}) {
    const db = getDb();
    if (!db) return { data: [], total: 0 };
    try {
      const { role, isBanned, limit = 20, offset = 0 } = criteria;
      let query = db.collection('users');
      if (role) query = query.where('role', '==', role);
      if (isBanned !== undefined) query = query.where('is_banned', '==', isBanned);
      query = query.orderBy('created_at', 'desc').limit(limit).offset(offset);
      const snap = await query.get();
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id, phoneHash: d.phone_hash, firebaseUid: d.firebase_uid,
          role: d.role || 'user',
          createdAt: d.created_at?.toDate?.()?.toISOString() || d.created_at,
          lastActive: d.last_active?.toDate?.()?.toISOString() || d.last_active,
          premiumUntil: d.premium_until?.toDate?.()?.toISOString() || d.premium_until,
          reportCount: d.report_count || 0, scanCount: d.scan_count || 0,
          isBanned: d.is_banned || false, banReason: d.ban_reason || null,
          metadata: d.metadata || {},
        };
      });
      return { data, total: data.length };
    } catch (err) {
      console.error('Firestore UserRepository.search error:', err);
      return { data: [], total: 0 };
    }
  }

  static async ping() {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await db.collection('users').limit(1).get();
  }

}

module.exports = UserRepository;
