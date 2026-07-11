// timeline/TimelineQueryService.js
// High-level query interface for timeline intelligence, combining repository and aggregator.

const TimelineRepository = require('./TimelineRepository');
const TimelineAggregator = require('./TimelineAggregator');
const TimelineBuilder = require('./TimelineBuilder');

class TimelineQueryService {
  /**
   * Get full entity timeline with evolution data.
   * @param {string} entityHash
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  static async getEntityTimeline(entityHash, options = {}) {
    const limit = options.limit || 50;
    return TimelineAggregator.getCombinedTimeline(entityHash, limit);
  }

  /**
   * Get case timeline (across multiple entities).
   * @param {Array<string>} entityHashes
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  static async getCaseTimeline(entityHashes, options = {}) {
    const limit = options.limit || 100;
    return TimelineAggregator.getCaseTimeline(entityHashes, limit);
  }

  /**
   * Get phone timeline including related entities.
   * @param {string} phoneHash
   * @param {Array<string>} relatedHashes
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  static async getPhoneTimeline(phoneHash, relatedHashes = [], options = {}) {
    const limit = options.limit || 50;
    return TimelineAggregator.getPhoneTimeline(phoneHash, relatedHashes, limit);
  }

  /**
   * Get bank account timeline.
   * @param {string} accountHash
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  static async getBankTimeline(accountHash, options = {}) {
    const limit = options.limit || 50;
    return TimelineAggregator.getBankTimeline(accountHash, limit);
  }

  /**
   * Get domain timeline.
   * @param {string} domainHash
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  static async getDomainTimeline(domainHash, options = {}) {
    const limit = options.limit || 50;
    return TimelineAggregator.getDomainTimeline(domainHash, limit);
  }

  /**
   * Get raw timeline events with filters.
   * @param {string} entityHash
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  static async getTimelineEvents(entityHash, filters = {}) {
    return TimelineRepository.findByEntity(entityHash, filters);
  }

  /**
   * Get activity summary for an entity.
   * @param {string} entityHash
   * @param {number} days
   * @returns {Promise<Object>}
   */
  static async getActivitySummary(entityHash, days = 30) {
    return TimelineAggregator.getActivitySummary(entityHash, days);
  }

  /**
   * Get risk evolution for an entity.
   * @param {string} entityHash
   * @returns {Promise<Object>}
   */
  static async getRiskEvolution(entityHash) {
    return TimelineAggregator.getRiskEvolutionSummary(entityHash);
  }

  /**
   * Get daily aggregation for an entity.
   * @param {string} entityHash
   * @param {number} days
   * @returns {Promise<Array>}
   */
  static async getDailyAggregation(entityHash, days = 30) {
    return TimelineRepository.getDailyAggregation(entityHash, days);
  }

  /**
   * Get weekly aggregation for an entity.
   * @param {string} entityHash
   * @param {number} weeks
   * @returns {Promise<Array>}
   */
  static async getWeeklyAggregation(entityHash, weeks = 12) {
    return TimelineRepository.getWeeklyAggregation(entityHash, weeks);
  }

  /**
   * Populate timeline_events from all source data.
   * @returns {Promise<number>}
   */
  static async populateAll() {
    return TimelineBuilder.populateAll();
  }

  /**
   * Check if timeline data exists for an entity.
   * @param {string} entityHash
   * @returns {Promise<boolean>}
   */
  static async hasTimeline(entityHash) {
    const count = await TimelineRepository.countByEntity(entityHash);
    return count > 0;
  }
}

module.exports = TimelineQueryService;