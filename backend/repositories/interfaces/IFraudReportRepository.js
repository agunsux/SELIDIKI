// repositories/interfaces/IFraudReportRepository.js
/** @interface IFraudReportRepository */
class IFraudReportRepository {
  /** @param {string} entityIdOrHash
   *  @returns {Promise<Object[]>} Array of FraudReport domain objects */
  async findByEntityId(entityIdOrHash) { throw new Error('Not implemented'); }

  /** @param {string} trackingId
   *  @returns {Promise<Object|null>} */
  async findByTrackingId(trackingId) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { targetHash, targetType, category, status, reporterHash, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = IFraudReportRepository;
