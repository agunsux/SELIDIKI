// community/AbuseDetection.js
/**
 * AbuseDetection — ARGUS v1.2
 *
 * Detects and prevents abuse of the community system.
 * Monitors for spam, vote manipulation, coordinated reporting, and fake accounts.
 */

const db = require('../utils/db');

class AbuseDetection {
  /** Check if an actor is engaging in suspicious activity. */
  static async checkActor(actorHash) {
    const checks = {};

    // Rapid actions in the last hour
    const recent = await db.query(
      `SELECT COUNT(*) as count FROM community_actions
       WHERE actor_hash = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [actorHash]
    );
    const recentCount = parseInt(recent.rows[0]?.count || 0);
    checks.rapidActions = recentCount > 20;

    // Same vote on many different entities (possible manipulation)
    const uniqueVotes = await db.query(
      `SELECT COUNT(DISTINCT report_id) as unique_reports FROM community_votes WHERE voter_hash = $1`,
      [actorHash]
    );
    const uniqueReports = parseInt(uniqueVotes.rows[0]?.unique_reports || 0);

    const totalVotes = await db.query(
      `SELECT COUNT(*) as total FROM community_votes WHERE voter_hash = $1`,
      [actorHash]
    );
    const totalVoteCount = parseInt(totalVotes.rows[0]?.total || 0);
    checks.lowDiversity = totalVoteCount > 10 && uniqueReports < 3;

    // Always downvoting (possible abuse)
    const downvoteRatio = await db.query(
      `SELECT COUNT(*) FILTER (WHERE vote='down') as downs,
              COUNT(*) as total FROM community_votes WHERE voter_hash = $1`,
      [actorHash]
    );
    const dRatio = parseInt(downvoteRatio.rows[0]?.downs || 0) / Math.max(parseInt(downvoteRatio.rows[0]?.total || 1), 1);
    checks.excessiveDownvotes = dRatio > 0.8 && parseInt(downvoteRatio.rows[0]?.total || 0) > 5;

    const isAbusive = checks.rapidActions || checks.lowDiversity || checks.excessiveDownvotes;

    return { isAbusive, checks };
  }

  /** Check if an entity is receiving suspicious votes. */
  static async checkEntity(entityHash) {
    const checks = {};

    const votes = await db.query(
      `SELECT cv.vote, cv.voter_hash, ca.action, COUNT(*) as cnt
       FROM community_votes cv
       JOIN community_actions ca ON ca.actor_hash = cv.voter_hash AND ca.entity_hash = $1
       GROUP BY cv.vote, cv.voter_hash, ca.action`,
      [entityHash]
    );
    checks.suspiciousPattern = votes.rows.length > 10 && votes.rows.every(r => r.vote === 'down');

    return { isAbusive: checks.suspiciousPattern, checks };
  }
}

module.exports = AbuseDetection;