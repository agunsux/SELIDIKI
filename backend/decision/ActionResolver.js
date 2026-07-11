// decision/ActionResolver.js
// Maps decisions to concrete actions.

class ActionResolver {
  static resolve(decision) {
    const map = {
      SAFE:          { action: 'allow',           priority: 0, notify: [],             channels: [] },
      LOW_RISK:      { action: 'allow_with_log',  priority: 1, notify: ['system'],     channels: ['log'] },
      MEDIUM_RISK:   { action: 'flag_for_review', priority: 2, notify: ['moderator'],  channels: ['dashboard'] },
      HIGH_RISK:     { action: 'investigate',     priority: 3, notify: ['security'],   channels: ['dashboard', 'email'] },
      BLOCK:         { action: 'block',           priority: 4, notify: ['security'],   channels: ['email', 'sms'] },
      MANUAL_REVIEW: { action: 'escalate',        priority: 5, notify: ['senior'],     channels: ['dashboard', 'email'] },
    };
    return map[decision] || { action: 'unknown', priority: 0, notify: [], channels: [] };
  }

  static resolveHighestPriority(decisions) {
    if (!decisions || decisions.length === 0) return ActionResolver.resolve('SAFE');
    let highest = null;
    for (const d of decisions) {
      const r = ActionResolver.resolve(d);
      if (!highest || r.priority > highest.priority) highest = r;
    }
    return highest;
  }
}

module.exports = ActionResolver;