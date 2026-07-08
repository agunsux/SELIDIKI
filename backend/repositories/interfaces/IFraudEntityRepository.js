// repositories/interfaces/IFraudEntityRepository.js
/** @interface IFraudEntityRepository */
class IFraudEntityRepository {
  /** @param {string} hash — Entity value hash
   *  @returns {Promise<Object|null>} FraudEntity domain object */
  async findByHash(hash) { throw new Error('Not implemented'); }

  /** @param {string} id — Entity UUID
   *  @returns {Promise<Object|null>} */
  async findById(id) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { entityType, riskScoreMin, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = IFraudEntityRepository;
