// timeline/TimelineAggregator.js
// Aggregates timeline events into structured summaries for dashboards and analysis.

const TimelineRepository = require('./TimelineRepository');

class TimelineAggregator {
  /**
   * Build an activity summary for an entity over a period.
   * @param {string} entityHash
   * @param {number} days
   * @returns {Promise<Object>}
   */
  static async getActivitySummary(entityHash, days = 30) {
    const counts = await TimelineRepository.countByType(entityHash);
    const daily = await TimelineRepository.getDailyAggregation(entityHash, days);
    const weekly = await TimelineRepository.getWeeklyAggregation(entityHash, Math.ceil(days / 7));

    const totalEvents = Object.values(counts).reduce((a, b) => a + b, 0);
    const daysWithActivity = new Set(daily.map(d => d.day)).size;

    return {
      entity_hash: entityHash,
      total_events: totalEvents,
      event_breakdown: counts,
      active_days: daysWithActivity,
      daily_aggregation: daily,
      weekly_aggregation: weekly,
      period_days: days,
    };
  }

  /**
   * Get risk score evolution summary with min/max/avg/trend.
   * @param {string} entityHash
   * @returns {Promise<Object>}
   */
  static async getRiskEvolutionSummary(entityHash) {
    const points = await TimelineRepository.getRiskEvolution(entityHash);
    if (points.length === 0) {
      return { has_data: false, min: 0, max: 0, avg: 0, latest: 0, trend: 'stable' };
    }

    const scores = points.map(p => parseFloat(p.risk_score));
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
    const latest = scores[scores.length - 1];
    const first = scores[0];

    let trend = 'stable';
    const change = latest - first;
    if (change >= 20) trend = 'rapidly_increasing';
    else if (change >= 5) trend = 'increasing';
    else if (change <= -20) trend = 'rapidly_decreasing';
    else if (change <= -5) trend = 'decreasing';

    return {
      has_data: true,
      min,
      max,
      avg,
      latest,
      trend,
      data_points: points.slice(-50), // Last 50 points for charting
    };
  }

  /**
   * Get trust score evolution summary.
   * @param {string} entityHash
   * @returns {Promise<Object>}
   */
  static async getTrustEvolutionSummary(entityHash) {
    const points = await TimelineRepository.getConfidenceEvolution(entityHash);
    if (points.length === 0) {
      return { has_data: false };
    }

    const confidences = points.map(p => parseFloat(p.confidence));
    const avg = Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100;
    const latest = confidences[confidences.length - 1];

    return {
      has_data: true,
      avg,
      latest,
      data_points: points.slice(-50),
    };
  }

  /**
   * Get combined timeline + evolution for an entity.
   * @param {string} entityHash
   * @param {number} limit
   * @returns {Promise<Object>}
   */
  static async getCombinedTimeline(entityHash, limit = 50) {
    const [events, riskEvo, trustEvo, summary] = await Promise.all([
      TimelineRepository.findByEntity(entityHash, { limit }),
      TimelineAggregator.getRiskEvolutionSummary(entityHash),
      TimelineAggregator.getTrustEvolutionSummary(entityHash),
      TimelineAggregator.getActivitySummary(entityHash, 30),
    ]);

    return {
      entity_hash: entityHash,
      timeline: events,
      risk_evolution: riskEvo,
      trust_evolution: trustEvo,
      activity_summary: summary,
    };
  }

  /**
   * Get combined timeline across multiple entities (case timeline).
   * @param {Array<string>} entityHashes
   * @param {number} limit
   * @returns {Promise<Object>}
   */
  static async getCaseTimeline(entityHashes, limit = 100) {
    if (entityHashes.length === 0) return { entities: [], timeline: [], total_events: 0 };

    const events = await TimelineRepository.findByEntities(entityHashes, { limit });
    const counts = {};

    for (const ev of events) {
      if (!counts[ev.entity_hash]) counts[ev.entity_hash] = 0;
      counts[ev.entity_hash]++;
    }

    return {
      entities: entityHashes.map(h => ({ hash: h, event_count: counts[h] || 0 })),
      timeline: events,
      total_events: events.length,
    };
  }

  /**
   * Get a telephone-focused timeline (phone + related bank/domain).
   * @param {string} phoneHash
   * @param {Array<string>} relatedHashes
   * @param {number} limit
   * @returns {Promise<Object>}
   */
  static async getPhoneTimeline(phoneHash, relatedHashes = [], limit = 50) {
    const allHashes = [phoneHash, ...relatedHashes.filter(h => h && h !== phoneHash)];
    return TimelineAggregator.getCaseTimeline(allHashes, limit);
  }

  /**
   * Get a bank account focused timeline.
   * @param {string} accountHash
   * @param {number} limit
   * @returns {Promise<Object>}
   */
  static async getBankTimeline(accountHash, limit = 50) {
    return TimelineAggregator.getCombinedTimeline(accountHash, limit);
  }

  /**
   * Get a domain focused timeline.
   * @param {string} domainHash
   * @param {number} limit
   * @returns {Promise<Object>}
   */
  static async getDomainTimeline(domainHash, limit = 50) {
    return TimelineAggregator.getCombinedTimeline(domainHash, limit);
  }
}

module.exports = TimelineAggregator;