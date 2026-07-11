// timeline/TimelineRepository.js
// Data access layer for the timeline_events table with filtered queries and aggregations.

const db = require('../utils/db');

class TimelineRepository {
  /**
   * Get timeline events for an entity.
   * @param {string} entityHash
   * @param {Object} filters
   * @param {string} filters.eventType - Filter by event type
   * @param {string} filters.startDate - ISO date string
   * @param {string} filters.endDate - ISO date string
   * @param {number} filters.limit
   * @param {number} filters.offset
   * @returns {Promise<Array>}
   */
  static async findByEntity(entityHash, filters = {}) {
    let query = 'SELECT * FROM timeline_events WHERE entity_hash = $1';
    const values = [entityHash];
    let paramIndex = 2;

    if (filters.eventType) {
      query += ` AND event_type = $${paramIndex++}`;
      values.push(filters.eventType);
    }
    if (filters.startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    query += ' ORDER BY timestamp DESC';
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(filters.offset);
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get timeline events for multiple entities (e.g., a case).
   * @param {Array<string>} entityHashes
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  static async findByEntities(entityHashes, filters = {}) {
    if (entityHashes.length === 0) return [];
    const placeholders = entityHashes.map((_, i) => `$${i + 1}`).join(',');
    let query = `SELECT * FROM timeline_events WHERE entity_hash IN (${placeholders})`;
    const values = [...entityHashes];
    let paramIndex = entityHashes.length + 1;

    if (filters.eventType) {
      query += ` AND event_type = $${paramIndex++}`;
      values.push(filters.eventType);
    }
    if (filters.startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    query += ' ORDER BY timestamp ASC';
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get timeline events by type within a date range.
   * @param {string} eventType
   * @param {string} startDate
   * @param {string} endDate
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async findByType(eventType, startDate, endDate, limit = 100) {
    let query = 'SELECT * FROM timeline_events WHERE event_type = $1';
    const values = [eventType];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      values.push(startDate);
    }
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      values.push(endDate);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Count events by type for an entity.
   * @param {string} entityHash
   * @returns {Promise<Object>} Map of event_type -> count
   */
  static async countByType(entityHash) {
    const query = `
      SELECT event_type, COUNT(*) AS count
      FROM timeline_events WHERE entity_hash = $1
      GROUP BY event_type ORDER BY count DESC
    `;
    const result = await db.query(query, [entityHash]);
    const counts = {};
    for (const row of result.rows) {
      counts[row.event_type] = parseInt(row.count, 10);
    }
    return counts;
  }

  /**
   * Get risk score evolution over time for an entity.
   * Returns data points for charting.
   * @param {string} entityHash
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getRiskEvolution(entityHash, limit = 100) {
    const query = `
      SELECT timestamp, risk_score, event_type
      FROM timeline_events
      WHERE entity_hash = $1 AND risk_score IS NOT NULL
      ORDER BY timestamp ASC
      LIMIT $2
    `;
    const result = await db.query(query, [entityHash, limit]);
    return result.rows;
  }

  /**
   * Get trust/confidence evolution over time for an entity.
   * @param {string} entityHash
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getConfidenceEvolution(entityHash, limit = 100) {
    const query = `
      SELECT timestamp, confidence, event_type
      FROM timeline_events
      WHERE entity_hash = $1 AND confidence IS NOT NULL
      ORDER BY timestamp ASC
      LIMIT $2
    `;
    const result = await db.query(query, [entityHash, limit]);
    return result.rows;
  }

  /**
   * Get daily aggregation of timeline events for an entity.
   * @param {string} entityHash
   * @param {number} days
   * @returns {Promise<Array>}
   */
  static async getDailyAggregation(entityHash, days = 30) {
    const query = `
      SELECT DATE(timestamp) AS day, event_type, COUNT(*) AS count
      FROM timeline_events
      WHERE entity_hash = $1 AND timestamp >= NOW() - INTERVAL '1 day' * $2
      GROUP BY DATE(timestamp), event_type
      ORDER BY day DESC, event_type
    `;
    const result = await db.query(query, [entityHash, days]);
    return result.rows;
  }

  /**
   * Get weekly aggregation of timeline events for an entity.
   * @param {string} entityHash
   * @param {number} weeks
   * @returns {Promise<Array>}
   */
  static async getWeeklyAggregation(entityHash, weeks = 12) {
    const query = `
      SELECT DATE_TRUNC('week', timestamp) AS week, event_type, COUNT(*) AS count
      FROM timeline_events
      WHERE entity_hash = $1 AND timestamp >= NOW() - INTERVAL '1 week' * $2
      GROUP BY DATE_TRUNC('week', timestamp), event_type
      ORDER BY week DESC, event_type
    `;
    const result = await db.query(query, [entityHash, weeks]);
    return result.rows;
  }

  /**
   * Get total event count for an entity.
   * @param {string} entityHash
   * @returns {Promise<number>}
   */
  static async countByEntity(entityHash) {
    const query = 'SELECT COUNT(*) FROM timeline_events WHERE entity_hash = $1';
    const result = await db.query(query, [entityHash]);
    return parseInt(result.rows[0].count, 10);
  }
}

module.exports = TimelineRepository;