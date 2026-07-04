// repositories/PhoneRepository.js
const FirestorePhoneRepository = require('./firestore/PhoneRepository');
const PostgresPhoneRepository = require('./postgres/PhoneRepository');
const { compareObjects } = require('../utils/dbComparer');

const provider = process.env.DATABASE_PROVIDER || 'FIRESTORE';

class PhoneRepository {
  static async findByHash(phoneHash) {
    if (provider === 'FIRESTORE') {
      return FirestorePhoneRepository.findByHash(phoneHash);
    }
    
    if (provider === 'POSTGRES') {
      return PostgresPhoneRepository.findByHash(phoneHash);
    }

    if (provider === 'DUAL_READ') {
      const fsResult = await FirestorePhoneRepository.findByHash(phoneHash);
      try {
        const pgResult = await PostgresPhoneRepository.findByHash(phoneHash);
        compareObjects('PhoneRepository.findByHash', fsResult, pgResult);
      } catch (err) {
        console.error('PhoneRepository DUAL_READ Postgres error:', err.message);
      }
      return fsResult;
    }

    // Default fallback
    return FirestorePhoneRepository.findByHash(phoneHash);
  }

  static async upsert(phoneHash, phoneData) {
    if (provider === 'FIRESTORE') {
      return FirestorePhoneRepository.upsert(phoneHash, phoneData);
    }

    if (provider === 'POSTGRES') {
      return PostgresPhoneRepository.upsert(phoneHash, phoneData);
    }

    if (provider === 'DUAL_WRITE') {
      await FirestorePhoneRepository.upsert(phoneHash, phoneData);
      try {
        await PostgresPhoneRepository.upsert(phoneHash, phoneData);
      } catch (err) {
        console.error('PhoneRepository DUAL_WRITE Postgres error:', err.message);
      }
      return;
    }

    // Default fallback
    return FirestorePhoneRepository.upsert(phoneHash, phoneData);
  }
}

module.exports = PhoneRepository;
