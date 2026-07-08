// repositories/UserRepository.js
const FirestoreUserRepository = require('./firestore/UserRepository');
const PostgresUserRepository = require('./postgres/UserRepository');
const { compareObjects } = require('../utils/dbComparer');
const { executeDualWrite } = require('../utils/dualWriteManager');
const shadowManager = require('../utils/shadowManager');
const dbConfig = require('../config/databaseProvider');

class UserRepository {
  static async findByFirebaseUid(uid) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreUserRepository.insert(userRecord);
      shadowManager.executeShadow('UserRepository', 'insert', fsResult,
        () => PostgresUserRepository.insert(userRecord), { type: 'user', hash: userRecord.phoneHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreUserRepository.findByFirebaseUid(uid);
    }

    if (dbConfig.isPostgres()) {
      return PostgresUserRepository.findByFirebaseUid(uid);
    }

    if (dbConfig.isDualRead()) {
      const fsResult = await FirestoreUserRepository.findByFirebaseUid(uid);
      try {
        const pgResult = await PostgresUserRepository.findByFirebaseUid(uid);
        compareObjects('UserRepository.findByFirebaseUid', fsResult, pgResult);
      } catch (err) {
        console.error('UserRepository DUAL_READ Postgres error:', err.message);
      }
      return fsResult;
    }

    // Default fallback
    return FirestoreUserRepository.findByFirebaseUid(uid);
  }

  static async findByHash(phoneHash) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreUserRepository.insert(userRecord);
      shadowManager.executeShadow('UserRepository', 'insert', fsResult,
        () => PostgresUserRepository.insert(userRecord), { type: 'user', hash: userRecord.phoneHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreUserRepository.findByHash(phoneHash);
    }

    if (dbConfig.isPostgres()) {
      return PostgresUserRepository.findByHash(phoneHash);
    }

    if (dbConfig.isDualRead()) {
      const fsResult = await FirestoreUserRepository.findByHash(phoneHash);
      try {
        const pgResult = await PostgresUserRepository.findByHash(phoneHash);
        compareObjects('UserRepository.findByHash', fsResult, pgResult);
      } catch (err) {
        console.error('UserRepository DUAL_READ Postgres error:', err.message);
      }
      return fsResult;
    }

    // Default fallback
    return FirestoreUserRepository.findByHash(phoneHash);
  }

  static async insert(userRecord) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreUserRepository.insert(userRecord);
      shadowManager.executeShadow('UserRepository', 'insert', fsResult,
        () => PostgresUserRepository.insert(userRecord), { type: 'user', hash: userRecord.phoneHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreUserRepository.insert(userRecord);
    }

    if (dbConfig.isPostgres()) {
      return PostgresUserRepository.insert(userRecord);
    }

    if (dbConfig.isDualWrite()) {
      return executeDualWrite('UserRepository', 'insert',
        () => FirestoreUserRepository.insert(userRecord),
        () => PostgresUserRepository.insert(userRecord),
        { type: 'user', hash: userRecord.phoneHash }
      );
    }

    // Default fallback
    return FirestoreUserRepository.insert(userRecord);
  }

  static async deleteByHash(phoneHash) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreUserRepository.insert(userRecord);
      shadowManager.executeShadow('UserRepository', 'insert', fsResult,
        () => PostgresUserRepository.insert(userRecord), { type: 'user', hash: userRecord.phoneHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreUserRepository.deleteByHash(phoneHash);
    }

    if (dbConfig.isPostgres()) {
      return PostgresUserRepository.deleteByHash(phoneHash);
    }

    if (dbConfig.isDualWrite()) {
      return executeDualWrite('UserRepository', 'deleteByHash',
        () => FirestoreUserRepository.deleteByHash(phoneHash),
        () => PostgresUserRepository.deleteByHash(phoneHash),
        { type: 'user', hash: phoneHash }
      );
    }

    // Default fallback
    return FirestoreUserRepository.deleteByHash(phoneHash);
  }
}

module.exports = UserRepository;



