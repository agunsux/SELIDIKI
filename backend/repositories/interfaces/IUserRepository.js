// repositories/interfaces/IUserRepository.js
/** @interface IUserRepository */
class IUserRepository {
  /** @param {string} uid — Firebase UID
   *  @returns {Promise<Object|null>} */
  async findByFirebaseUid(uid) { throw new Error('Not implemented'); }

  /** @param {string} phoneHash
   *  @returns {Promise<Object|null>} */
  async findByHash(phoneHash) { throw new Error('Not implemented'); }

  /** @param {Object} userRecord — { phoneHash, firebaseUid, metadata }
   *  @returns {Promise<Object>} */
  async insert(userRecord) { throw new Error('Not implemented'); }

  /** @param {string} phoneHash
   *  @returns {Promise<boolean>} */
  async deleteByHash(phoneHash) { throw new Error('Not implemented'); }

  /** @param {Object} criteria — { role, isBanned, limit, offset }
   *  @returns {Promise<{data: Object[], total: number}>} */
  async search(criteria) { throw new Error('Not implemented'); }

  /** @returns {Promise<void>} */
  async ping() { throw new Error('Not implemented'); }
}
module.exports = IUserRepository;
