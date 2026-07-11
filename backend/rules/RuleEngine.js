// rules/RuleEngine.js
// Main orchestrator that loads, validates, and evaluates rules against incoming data.
const RuleRepository = require('./RuleRepository');
const RuleCompiler = require('./RuleCompiler');
const RuleEvaluator = require('./RuleEvaluator');
const logger = require('../utils/logger');
class RuleEngine {
  constructor() {
    this._initialized = false;
    this._activeRules = [];
  }
  async initialize() {
    await RuleRepository.ensureTable();
    await this._loadRules();
    this._initialized = true;
    logger.info('RuleEngine initialized with ' + this._activeRules.length + ' active rules');
  }
  async _loadRules() {
    this._activeRules = await RuleRepository.loadActiveRules();
  }
  async refreshRules() {
    RuleRepository.invalidateCache();
    await this._loadRules();
    logger.info('RuleEngine rules refreshed: ' + this._activeRules.length + ' active');
  }
  async evaluate(data) {
    if (!this._initialized) {
      await this.initialize();
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Data payload must be a non-null object');
    }
    var triggered = [];
    for (var i = 0; i < this._activeRules.length; i++) {
      var rule = this._activeRules[i];
      try {
        var compiled = RuleCompiler.compileRule(rule);
        var evalResult = compiled.evaluate(data);
        if (evalResult.matched) {
          triggered.push({
            ruleId: rule.id,
            ruleName: rule.name,
            action: rule.action,
            priority: rule.priority,
            matchScore: evalResult.matchScore,
            threshold: evalResult.threshold,
            thresholdMet: evalResult.thresholdMet,
            details: evalResult
          });
        }
      } catch (err) {
        logger.error('Error evaluating rule "' + rule.name + '": ' + err.message);
      }
    }
    triggered.sort(function(a, b) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.matchScore - a.matchScore;
    });
    var highestAction = triggered.length > 0 ? triggered[0].action : null;
    return {
      triggered: triggered,
      summary: {
        totalActiveRules: this._activeRules.length,
        triggeredCount: triggered.length,
        highestAction: highestAction,
        highestPriority: triggered.length > 0 ? triggered[0].priority : null
      }
    };
  }
  evaluateSingleRule(ruleDef, data) {
    var compiled = RuleCompiler.compileRule(ruleDef);
    return compiled.evaluate(data);
  }
  getActiveRules() {
    return this._activeRules.slice();
  }
}
module.exports = new RuleEngine();