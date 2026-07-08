// repositories/interfaces/IReportRepository.js
/** @interface IReportRepository */
class IReportRepository {
  /** @param {Object} reportData — { trackingId, targetType, targetHash, category, description, evidenceUrl, reporterHash, confidence, bankCode }
   *  @returns {Promise<Object>} */
  async insert(reportData) { throw new Error('Not implemented'); }

  /** @param {Object} params — { limit, category }
   *  @returns {Promise<Object[]>} */
  async findTrending(params) { throw new Error('Not implemented'); }

  /** @param {string} trackingId
   *  @returns {Promise<Object|null>} */
  async findByTrackingId(trackingId) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { targetHash, targetType, category, status, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = IReportRepository;
