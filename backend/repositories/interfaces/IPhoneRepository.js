// repositories/interfaces/IPhoneRepository.js
/**
 * PhoneRepository Contract — SELIDIKI Architecture v1.0
 *
 * Resolves phone number fraud risk profiles.
 * Implementations: Firestore adapter, PostgreSQL adapter.
 *
 * Contract Tests: test/contracts/phoneRepository.contract.test.js
 *
 * @interface IPhoneRepository
 * @extends IRepository
 */

class IPhoneRepository {
  /**
   * Find a phone profile by its SHA-256 hash.
   * @param {string} phoneHash — SHA-256 hash of normalized phone number
   * @returns {Promise<Object|null>} { id, phoneHash, riskScore, category, reportsCount,
   *   verifiedReportsCount, signals, lastActivity, firstReported, trend7d, isConfirmedFraud }
   */
  async findByHash(phoneHash) { throw new Error('Not implemented'); }

  /**
   * Upsert a phone profile. Idempotent.
   * @param {string} phoneHash
   * @param {Object} phoneData — { riskScore, category, reportsCount, lastActivity }
   * @returns {Promise<void>}
   */
  async upsert(phoneHash, phoneData) { throw new Error('Not implemented'); }

  /**
   * Search phone profiles with pagination.
   * @param {Object} criteria — { riskScoreMin, riskScoreMax, category, limit, offset, sortBy }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async search(criteria) { throw new Error('Not implemented'); }

  /**
   * Health check.
   * @returns {Promise<void>}
   */
  async ping() { throw new Error('Not implemented'); }
}

module.exports = IPhoneRepository;
