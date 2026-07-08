// repositories/ReportRepository.js
const FirestoreReportRepository = require('./firestore/ReportRepository');
const PostgresReportRepository = require('./postgres/ReportRepository');
const { compareObjects } = require('../utils/dbComparer');
const { executeDualWrite } = require('../utils/dualWriteManager');
const shadowManager = require('../utils/shadowManager');
const dbConfig = require('../config/databaseProvider');

class ReportRepository {
  static async insert(reportData) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreReportRepository.insert(reportData);
      shadowManager.executeShadow('ReportRepository', 'insert', fsResult,
        () => PostgresReportRepository.insert(reportData), { type: reportData.targetType, hash: reportData.targetHash || reportData.trackingId });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreReportRepository.insert(reportData);
    }

    if (dbConfig.isPostgres()) {
      return PostgresReportRepository.insert(reportData);
    }

    if (dbConfig.isDualWrite()) {
      return executeDualWrite('ReportRepository', 'insert',
        () => FirestoreReportRepository.insert(reportData),
        () => PostgresReportRepository.insert(reportData),
        { type: reportData.targetType, hash: reportData.targetHash || reportData.trackingId }
      );
    }

    return FirestoreReportRepository.insert(reportData);
  }

  static async findTrending({ limit = 10, category }) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreReportRepository.insert(reportData);
      shadowManager.executeShadow('ReportRepository', 'insert', fsResult,
        () => PostgresReportRepository.insert(reportData), { type: reportData.targetType, hash: reportData.targetHash || reportData.trackingId });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreReportRepository.findTrending({ limit, category });
    }

    if (dbConfig.isPostgres()) {
      return PostgresReportRepository.findTrending({ limit, category });
    }

    if (dbConfig.isDualRead()) {
      const fsResult = await FirestoreReportRepository.findTrending({ limit, category });
      try {
        const pgResult = await PostgresReportRepository.findTrending({ limit, category });
        if (fsResult[0] && pgResult[0]) {
          compareObjects('ReportRepository.findTrending[0]', fsResult[0], pgResult[0]);
        }
      } catch (err) {
        console.error('ReportRepository DUAL_READ Postgres error:', err.message);
      }
      return fsResult;
    }

    return FirestoreReportRepository.findTrending({ limit, category });
  }
}

module.exports = ReportRepository;



