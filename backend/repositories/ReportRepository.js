// repositories/ReportRepository.js
const FirestoreReportRepository = require('./firestore/ReportRepository');
const PostgresReportRepository = require('./postgres/ReportRepository');
const { compareObjects } = require('../utils/dbComparer');

const provider = process.env.DATABASE_PROVIDER || 'FIRESTORE';

class ReportRepository {
  static async insert(reportData) {
    if (provider === 'FIRESTORE') {
      return FirestoreReportRepository.insert(reportData);
    }

    if (provider === 'POSTGRES') {
      return PostgresReportRepository.insert(reportData);
    }

    if (provider === 'DUAL_WRITE') {
      const fsResult = await FirestoreReportRepository.insert(reportData);
      try {
        await PostgresReportRepository.insert(reportData);
      } catch (err) {
        console.error('ReportRepository DUAL_WRITE Postgres error:', err.message);
      }
      return fsResult;
    }

    return FirestoreReportRepository.insert(reportData);
  }

  static async findTrending({ limit = 10, category }) {
    if (provider === 'FIRESTORE') {
      return FirestoreReportRepository.findTrending({ limit, category });
    }

    if (provider === 'POSTGRES') {
      return PostgresReportRepository.findTrending({ limit, category });
    }

    if (provider === 'DUAL_READ') {
      const fsResult = await FirestoreReportRepository.findTrending({ limit, category });
      try {
        const pgResult = await PostgresReportRepository.findTrending({ limit, category });
        // Compare first item for sample validation
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
