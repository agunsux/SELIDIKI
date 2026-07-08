// repositories/interfaces/ILookupLogRepository.js
/** @interface ILookupLogRepository */
class ILookupLogRepository {
  /** @param {Object} params — { queryId, entityType, hash, cacheHit, riskScore }
   *  @returns {Promise<void>} */
  async insert(params) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { entityType, hash, startDate, endDate, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = ILookupLogRepository;
