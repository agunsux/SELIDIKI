// repositories/postgres/UserRepository.js
const db = require('../../utils/db');

class UserRepository {
  static async findByFirebaseUid(uid) {
    try {
      const query = 'SELECT * FROM users WHERE firebase_uid = $1';
      const { rows } = await db.query(query, [uid]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        phoneHash: row.phone_hash,
        firebaseUid: row.firebase_uid,
        createdAt: row.created_at,
        lastActive: row.last_active,
        premiumUntil: row.premium_until,
        reportCount: row.report_count,
        scanCount: row.scan_count,
        isBanned: row.is_banned,
        banReason: row.ban_reason,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      };
    } catch (err) {
      console.error('Postgres UserRepository.findByFirebaseUid error:', err);
      throw err;
    }
  }

  static async findByHash(phoneHash) {
    try {
      const query = 'SELECT * FROM users WHERE phone_hash = $1';
      const { rows } = await db.query(query, [phoneHash]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        phoneHash: row.phone_hash,
        firebaseUid: row.firebase_uid,
        createdAt: row.created_at,
        lastActive: row.last_active,
        premiumUntil: row.premium_until,
        reportCount: row.report_count,
        scanCount: row.scan_count,
        isBanned: row.is_banned,
        banReason: row.ban_reason,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      };
    } catch (err) {
      console.error('Postgres UserRepository.findByHash error:', err);
      throw err;
    }
  }

  static async insert(userRecord) {
    try {
      const query = `
        INSERT INTO users (phone_hash, firebase_uid, created_at, last_active, metadata)
        VALUES ($1, $2, NOW(), NOW(), $3)
        RETURNING *
      `;
      const { rows } = await db.query(query, [
        userRecord.phoneHash,
        userRecord.firebaseUid,
        JSON.stringify(userRecord.metadata || {})
      ]);
      const row = rows[0];
      return {
        id: row.id,
        phoneHash: row.phone_hash,
        firebaseUid: row.firebase_uid,
        createdAt: row.created_at,
        lastActive: row.last_active,
        premiumUntil: row.premium_until,
        reportCount: row.report_count,
        scanCount: row.scan_count,
        isBanned: row.is_banned,
        banReason: row.ban_reason,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      };
    } catch (err) {
      console.error('Postgres UserRepository.insert error:', err);
      throw err;
    }
  }

  static async deleteByHash(phoneHash) {
    try {
      const query = 'DELETE FROM users WHERE phone_hash = $1';
      const { rowCount } = await db.query(query, [phoneHash]);
      return rowCount > 0;
    } catch (err) {
      console.error('Postgres UserRepository.deleteByHash error:', err);
      throw err;
    }
  }
}

module.exports = UserRepository;
