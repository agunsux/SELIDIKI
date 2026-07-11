// analytics/TrendAnalyzer.js
/**
 * TrendAnalyzer — ARGUS v1.3
 *
 * Aggregates fraud trends: daily/weekly/monthly/yearly reports, categories, regions.
 */

const db = require('../utils/db');

class TrendAnalyzer {
  static async getTrends(period = 'daily', days = 30) {
    let interval;
    switch (period) {
      case 'daily': interval = '24 hours'; break;
      case 'weekly': interval = '7 days'; break;
      case 'monthly': interval = '30 days'; break;
      case 'yearly': interval = '365 days'; break;
      default: interval = '30 days';
    }

    const dateTrunc = period === 'daily' ? 'hour' : period === 'weekly' ? 'day' : period === 'monthly' ? 'day' : 'month';

    const result = await db.query(`
      SELECT date_trunc($1, timestamp) as period_start, COUNT(*) as count,
             COUNT(DISTINCT hash) as unique_entities,
             AVG(risk_score) as avg_risk
      FROM fraud_events WHERE timestamp > NOW() - $2::interval
      GROUP BY period_start ORDER BY period_start
    `, [dateTrunc, `${days} days`]);
    return result.rows.map(r => ({
      period: r.period_start, count: parseInt(r.count), uniqueEntities: parseInt(r.unique_entities), avgRisk: parseFloat(r.avg_risk || 0),
    }));
  }

  static async topCategories(limit = 10) {
    const result = await db.query(`
      SELECT category, COUNT(*) as count FROM fraud_events
      WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT $1
    `, [limit]);
    return result.rows.map(r => ({ category: r.category, count: parseInt(r.count) }));
  }

  static async byOperator() {
    const result = await db.query(`
      SELECT properties->>'operator' as operator, COUNT(*) as count, AVG(risk_score) as avg_risk
      FROM graph_nodes WHERE type = 'phone' AND properties->>'operator' IS NOT NULL
      GROUP BY operator ORDER BY count DESC
    `);
    return result.rows.map(r => ({ operator: r.operator, count: parseInt(r.count), avgRisk: parseFloat(r.avg_risk || 0) }));
  }

  static async byRegion() {
    const result = await db.query(`
      SELECT properties->>'region' as region, COUNT(*) as count, AVG(risk_score) as avg_risk
      FROM graph_nodes WHERE type = 'phone' AND properties->>'region' IS NOT NULL
      GROUP BY region ORDER BY count DESC
    `);
    return result.rows.map(r => ({ region: r.region, count: parseInt(r.count), avgRisk: parseFloat(r.avg_risk || 0) }));
  }
}

module.exports = TrendAnalyzer;