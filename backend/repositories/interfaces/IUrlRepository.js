// repositories/interfaces/IUrlRepository.js
/** @interface IUrlRepository */
class IUrlRepository {
  /** @param {string} domain
   *  @returns {Promise<Object|null>} { id, domain, urlHash, riskScore, isPhishing, isMalware, registeredAt, country, reportsCount, firstSeen, lastChecked } */
  async findByDomain(domain) { throw new Error('Not implemented'); }

  /** @param {string} urlHash
   *  @param {string} domain
   *  @param {Object} urlData — { riskScore, isPhishing, isMalware, reportsCount }
   *  @returns {Promise<void>} */
  async upsert(urlHash, domain, urlData) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { isPhishing, isMalware, riskScoreMin, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = IUrlRepository;
