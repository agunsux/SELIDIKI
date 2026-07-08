// repositories/HistoryRepository.js
const FirestoreHistoryRepository = require('./firestore/HistoryRepository');
const PostgresHistoryRepository = require('./postgres/HistoryRepository');
const { compareObjects } = require('../utils/dbComparer');
const { executeDualWrite } = require('../utils/dualWriteManager');
const shadowManager = require('../utils/shadowManager');
const dbConfig = require('../config/databaseProvider');

class HistoryRepository {
  static async insert(scanData) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreHistoryRepository.insert(scanData);
      shadowManager.executeShadow('HistoryRepository', 'insert', fsResult,
        () => PostgresHistoryRepository.insert(scanData), { type: 'scan', hash: scanData.userHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreHistoryRepository.insert(scanData);
    }

    if (dbConfig.isPostgres()) {
      return PostgresHistoryRepository.insert(scanData);
    }

    if (dbConfig.isDualWrite()) {
      return executeDualWrite('HistoryRepository', 'insert',
        () => FirestoreHistoryRepository.insert(scanData),
        () => PostgresHistoryRepository.insert(scanData),
        { type: 'scan', hash: scanData.userHash }
      );
    }

    return FirestoreHistoryRepository.insert(scanData);
  }

  static async findByUserHash(userHash, limit = 20, offset = 0) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreHistoryRepository.insert(scanData);
      shadowManager.executeShadow('HistoryRepository', 'insert', fsResult,
        () => PostgresHistoryRepository.insert(scanData), { type: 'scan', hash: scanData.userHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreHistoryRepository.findByUserHash(userHash, limit, offset);
    }

    if (dbConfig.isPostgres()) {
      return PostgresHistoryRepository.findByUserHash(userHash, limit, offset);
    }

    if (dbConfig.isDualRead()) {
      const fsResult = await FirestoreHistoryRepository.findByUserHash(userHash, limit, offset);
      try {
        const pgResult = await PostgresHistoryRepository.findByUserHash(userHash, limit, offset);
        if (fsResult.data[0] && pgResult.data[0]) {
          compareObjects('HistoryRepository.findByUserHash[0]', fsResult.data[0], pgResult.data[0]);
        }
      } catch (err) {
        console.error('HistoryRepository DUAL_READ Postgres error:', err.message);
      }
      return fsResult;
    }

    return FirestoreHistoryRepository.findByUserHash(userHash, limit, offset);
  }
}

module.exports = HistoryRepository;



