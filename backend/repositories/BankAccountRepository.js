// repositories/BankAccountRepository.js
const FirestoreBankAccountRepository = require('./firestore/BankAccountRepository');
const PostgresBankAccountRepository = require('./postgres/BankAccountRepository');
const { compareObjects } = require('../utils/dbComparer');
const { executeDualWrite } = require('../utils/dualWriteManager');
const shadowManager = require('../utils/shadowManager');
const dbConfig = require('../config/databaseProvider');

class BankAccountRepository {
  static async findByHashAndBank(accountHash, bankCode) {
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreBankAccountRepository.findByHashAndBank(accountHash, bankCode);
      shadowManager.executeShadow('BankAccountRepository', 'findByHashAndBank', fsResult,
        () => PostgresBankAccountRepository.findByHashAndBank(accountHash, bankCode), { type: 'account', hash: accountHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreBankAccountRepository.findByHashAndBank(accountHash, bankCode);
    }

    if (dbConfig.isPostgres()) {
      return PostgresBankAccountRepository.findByHashAndBank(accountHash, bankCode);
    }

    if (dbConfig.isDualRead()) {
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
    if (dbConfig.isShadow()) {
      const fsResult = await FirestoreBankAccountRepository.findByHashAndBank(accountHash, bankCode);
      shadowManager.executeShadow('BankAccountRepository', 'findByHashAndBank', fsResult,
        () => PostgresBankAccountRepository.findByHashAndBank(accountHash, bankCode), { type: 'account', hash: accountHash });
      return fsResult;
    }
    if (dbConfig.isFirestore()) {
      return FirestoreBankAccountRepository.upsert(accountHash, bankCode, accountData);
    }

    if (dbConfig.isPostgres()) {
      return PostgresBankAccountRepository.upsert(accountHash, bankCode, accountData);
    }

    if (dbConfig.isDualWrite()) {
      return executeDualWrite('BankAccountRepository', 'upsert',
        () => FirestoreBankAccountRepository.upsert(accountHash, bankCode, accountData),
        () => PostgresBankAccountRepository.upsert(accountHash, bankCode, accountData),
        { type: 'account', hash: accountHash }
      );
    }

    return FirestoreBankAccountRepository.upsert(accountHash, bankCode, accountData);
  }
}

module.exports = BankAccountRepository;



