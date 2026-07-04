// repositories/BankAccountRepository.js
const FirestoreBankAccountRepository = require('./firestore/BankAccountRepository');
const PostgresBankAccountRepository = require('./postgres/BankAccountRepository');
const { compareObjects } = require('../utils/dbComparer');

const provider = process.env.DATABASE_PROVIDER || 'FIRESTORE';

class BankAccountRepository {
  static async findByHashAndBank(accountHash, bankCode) {
    if (provider === 'FIRESTORE') {
      return FirestoreBankAccountRepository.findByHashAndBank(accountHash, bankCode);
    }
    
    if (provider === 'POSTGRES') {
      return PostgresBankAccountRepository.findByHashAndBank(accountHash, bankCode);
    }

    if (provider === 'DUAL_READ') {
      const fsResult = await FirestoreBankAccountRepository.findByHashAndBank(accountHash, bankCode);
      try {
        const pgResult = await PostgresBankAccountRepository.findByHashAndBank(accountHash, bankCode);
        compareObjects('BankAccountRepository.findByHashAndBank', fsResult, pgResult);
      } catch (err) {
        console.error('BankAccountRepository DUAL_READ Postgres error:', err.message);
      }
      return fsResult;
    }

    return FirestoreBankAccountRepository.findByHashAndBank(accountHash, bankCode);
  }

  static async upsert(accountHash, bankCode, accountData) {
    if (provider === 'FIRESTORE') {
      return FirestoreBankAccountRepository.upsert(accountHash, bankCode, accountData);
    }

    if (provider === 'POSTGRES') {
      return PostgresBankAccountRepository.upsert(accountHash, bankCode, accountData);
    }

    if (provider === 'DUAL_WRITE') {
      await FirestoreBankAccountRepository.upsert(accountHash, bankCode, accountData);
      try {
        await PostgresBankAccountRepository.upsert(accountHash, bankCode, accountData);
      } catch (err) {
        console.error('BankAccountRepository DUAL_WRITE Postgres error:', err.message);
      }
      return;
    }

    return FirestoreBankAccountRepository.upsert(accountHash, bankCode, accountData);
  }
}

module.exports = BankAccountRepository;
