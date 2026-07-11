// moderation/VerificationWorkflow.js
// State machine for the moderation/verification workflow.
// Valid states: pending -> (verified | rejected | needs_more_evidence) -> appealed -> (verified | rejected)

const VALID_TRANSITIONS = {
  pending: ['verified', 'rejected', 'needs_more_evidence'],
  needs_more_evidence: ['verified', 'rejected', 'appealed'],
  appealed: ['verified', 'rejected'],
  verified: [],
  rejected: [],
};

class VerificationWorkflow {
  /**
   * Validate a state transition.
   * @param {string} currentStatus
   * @param {string} newStatus
   * @returns {Object} { valid, error }
   */
  static validateTransition(currentStatus, newStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed) {
      return { valid: false, error: `Unknown current status: ${currentStatus}` };
    }
    if (!allowed.includes(newStatus)) {
      return {
        valid: false,
        error: `Invalid transition: ${currentStatus} -> ${newStatus}. Allowed: ${allowed.join(', ')}`,
      };
    }
    return { valid: true, error: null };
  }

  /**
   * Get all possible next states from a given status.
   * @param {string} currentStatus
   * @returns {Array}
   */
  static getNextStates(currentStatus) {
    return VALID_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Check if a status is terminal (no further transitions).
   * @param {string} status
   * @returns {boolean}
   */
  static isTerminal(status) {
    return VALID_TRANSITIONS[status]?.length === 0;
  }

  /**
   * Get the full workflow state machine definition.
   * @returns {Object}
   */
  static getStateMachine() {
    return {
      states: Object.keys(VALID_TRANSITIONS),
      transitions: VALID_TRANSITIONS,
      terminal: Object.entries(VALID_TRANSITIONS)
        .filter(([, v]) => v.length === 0)
        .map(([k]) => k),
    };
  }
}

module.exports = VerificationWorkflow;