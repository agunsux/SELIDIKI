// backend/repositories/interfaces/phoneRepositoryInterface.js
/**
 * Interface for PhoneRepository.
 * Implementations must provide these methods.
 */
class PhoneRepository {
  async create(phoneHash, countryCode) { throw new Error('Not implemented'); }
  async findByHash(phoneHash) { throw new Error('Not implemented'); }
  async incrementRisk(phoneHash, delta) { throw new Error('Not implemented'); }
  async incrementReportCount(phoneHash) { throw new Error('Not implemented'); }
  async updateLastSeen(phoneHash) { throw new Error('Not implemented'); }
}
module.exports = PhoneRepository;
