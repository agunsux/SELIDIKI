// trust/TrustBadgeEngine.js
/**
 * TrustBadgeEngine — ARGUS v1.3
 *
 * Determines what trust badge an entity qualifies for based on
 * identity verification, community trust, evidence quality, and history.
 */

const IdentityVerificationService = require('./IdentityVerificationService');
const ReporterVerification = require('./ReporterVerification');

class TrustBadgeEngine {
  static async getBadge(entityHash, entityType = 'phone') {
    // 1. Check active identity badge
    const identityBadge = await IdentityVerificationService.getBadge(entityHash);
    if (identityBadge) {
      return { badge: identityBadge.identityType, level: identityBadge.level, source: 'verified_identity' };
    }

    // 2. Check reporter tier
    if (entityType === 'reporter') {
      const tier = await ReporterVerification.getTier(entityHash);
      if (tier.tier !== 'unverified') {
        return { badge: tier.tier, level: tier.tier === 'verified_investigator' ? 'verified' : 'standard', source: 'reporter_history' };
      }
    }

    return null;
  }
}

module.exports = TrustBadgeEngine;