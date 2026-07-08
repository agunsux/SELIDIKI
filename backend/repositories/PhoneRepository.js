// repositories/PhoneRepository.js
const FirestorePhoneRepository = require('./firestore/PhoneRepository');
const PostgresPhoneRepository = require('./postgres/PhoneRepository');
const { compareObjects } = require('../utils/dbComparer');
const { executeDualWrite } = require('../utils/dualWriteManager');
const shadowManager = require('../utils/shadowManager');
const dbConfig = require('../config/databaseProvider');

class PhoneRepository {
  static async findByHash(phoneHash) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestorePhoneRepository.findByHash(phoneHash);
      shadowManager.executeShadow('PhoneRepository', 'findByHash', fsResult,
        () => PostgresPhoneRepository.findByHash(phoneHash), { type: 'phone', hash: phoneHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) return FirestorePhoneRepository.findByHash(phoneHash);
    if (dbConfig.isPostgres()) return PostgresPhoneRepository.findByHash(phoneHash);
    if (dbConfig.isDualRead()) {
      const fsResult = await FirestorePhoneRepository.findByHash(phoneHash);
      try { const pgResult = await PostgresPhoneRepository.findByHash(phoneHash); compareObjects('PhoneRepository.findByHash', fsResult, pgResult); } catch (err) { console.error('PhoneRepository DUAL_READ Postgres error:', err.message); }
      return fsResult;
    }
    return FirestorePhoneRepository.findByHash(phoneHash);
  }

  static async upsert(phoneHash, phoneData) {
    if (dbConfig.isFirestore() || dbConfig.isShadow()) return FirestorePhoneRepository.upsert(phoneHash, phoneData);
    if (dbConfig.isPostgres()) return PostgresPhoneRepository.upsert(phoneHash, phoneData);
    if (dbConfig.isDualWrite()) {
      return executeDualWrite('PhoneRepository', 'upsert',
        () => FirestorePhoneRepository.upsert(phoneHash, phoneData),
        () => PostgresPhoneRepository.upsert(phoneHash, phoneData),
        { type: 'phone', hash: phoneHash }
      );
    }
    return FirestorePhoneRepository.upsert(phoneHash, phoneData);
  }
}
module.exports = PhoneRepository;
