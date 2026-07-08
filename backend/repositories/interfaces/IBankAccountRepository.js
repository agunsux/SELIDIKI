// repositories/interfaces/IBankAccountRepository.js
/**
 * BankAccountRepository Contract — SELIDIKI Architecture v1.0
 * @interface IBankAccountRepository
 */
class IBankAccountRepository {
  /**
   * @param {string} accountHash
   * @param {string} bankCode
   * @returns {Promise<Object|null>} { id, accountHash, bankCode, riskScore, reportsCount, categories, lastActivity, firstReported, isBlocked }
   */
  async findByHashAndBank(accountHash, bankCode) { throw new Error('Not implemented'); }

  /**
   * @param {string} accountHash
   * @param {string} bankCode
   * @param {Object} accountData — { riskScore, reportsCount, categories, lastActivity }
   * @returns {Promise<void>}
   */
  async upsert(accountHash, bankCode, accountData) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { bankCode, riskScoreMin, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = IBankAccountRepository;
