// repositories/interfaces/IHistoryRepository.js
/** @interface IHistoryRepository */
class IHistoryRepository {
  /** @param {Object} scanData — { userHash, inputType, riskScore, result }
   *  @returns {Promise<void>} */
  async insert(scanData) { throw new Error('Not implemented'); }

  /** @param {string} userHash
   *  @param {number} [limit=20]
   *  @param {number} [offset=0]
   *  @returns {Promise<{data: Object[], total: number}>} */
  async findByUserHash(userHash, limit, offset) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { userHash, inputType, riskScoreMin, startDate, endDate, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = IHistoryRepository;
