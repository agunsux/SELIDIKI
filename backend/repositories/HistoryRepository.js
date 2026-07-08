// repositories/HistoryRepository.js
const FirestoreHistoryRepository = require('./firestore/HistoryRepository');
const PostgresHistoryRepository = require('./postgres/HistoryRepository');
const { compareObjects } = require('../utils/dbComparer');
const { executeDualWrite } = require('../utils/dualWriteManager');
const shadowManager = require('../utils/shadowManager');
const { executeDualRead } = require('../utils/dualReadManager');
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
      return executeDualRead('HistoryRepository', 'findByUserHash',
        () => FirestoreHistoryRepository.findByUserHash(userHash, limit, offset),
        () => PostgresHistoryRepository.findByUserHash(userHash, limit, offset),
        { type: 'history', hash: userHash }
      );
    }

    return FirestoreHistoryRepository.findByUserHash(userHash, limit, offset);
  }
}

module.exports = HistoryRepository;




