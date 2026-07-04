// repositories/HistoryRepository.js
const FirestoreHistoryRepository = require('./firestore/HistoryRepository');
const PostgresHistoryRepository = require('./postgres/HistoryRepository');
const { compareObjects } = require('../utils/dbComparer');

const provider = process.env.DATABASE_PROVIDER || 'FIRESTORE';

class HistoryRepository {
  static async insert(scanData) {
    if (provider === 'FIRESTORE') {
      return FirestoreHistoryRepository.insert(scanData);
    }

    if (provider === 'POSTGRES') {
      return PostgresHistoryRepository.insert(scanData);
    }

    if (provider === 'DUAL_WRITE') {
      await FirestoreHistoryRepository.insert(scanData);
      try {
        await PostgresHistoryRepository.insert(scanData);
      } catch (err) {
        console.error('HistoryRepository DUAL_WRITE Postgres error:', err.message);
      }
      return;
    }

    return FirestoreHistoryRepository.insert(scanData);
  }

  static async findByUserHash(userHash, limit = 20, offset = 0) {
    if (provider === 'FIRESTORE') {
      return FirestoreHistoryRepository.findByUserHash(userHash, limit, offset);
    }

    if (provider === 'POSTGRES') {
      return PostgresHistoryRepository.findByUserHash(userHash, limit, offset);
    }

    if (provider === 'DUAL_READ') {
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
