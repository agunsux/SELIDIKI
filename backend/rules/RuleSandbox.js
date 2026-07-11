// rules/RuleSandbox.js
// Sandboxed test environment for previewing rule outcomes without persisting.

const RC = require('./RuleCompiler');
const RE = require('./RuleEvaluator');

/**
 * Run a rule against sample data in sandbox mode.
 * @param {Object} ruleDef - Rule definition
 * @param {Object} sampleData - Test data
 * @param {Object} options - { verbose }
 * @returns {Object} { valid, matched, matchScore, conditionBreakdown, ... }
 */
function runSandbox(ruleDef, sampleData, options) {
  if (!ruleDef || typeof ruleDef !== 'object') {
    return { valid: false, error: 'Rule definition must be an object' };
  }
  if (!sampleData || typeof sampleData !== 'object') {
    return { valid: false, error: 'Sample data must be an object' };
  }
  const verbose = options && options.verbose === true;

  const validation = RC.validateRuleDefinition(ruleDef);
  if (!validation.valid) {
    return {
      valid: false,
      error: 'Rule validation failed',
      validationErrors: validation.errors,
      ruleName: ruleDef.name || 'unnamed',
    };
  }

  let compiled;
  try {
    compiled = RC.compileRule(ruleDef);
  } catch (err) {
    return {
      valid: false,
      error: 'Rule compilation failed: ' + err.message,
      ruleName: ruleDef.name,
    };
  }

  let result;
  try {
    result = compiled.evaluate(sampleData);
  } catch (err) {
    return {
      valid: false,
      error: 'Rule evaluation failed: ' + err.message,
      ruleName: ruleDef.name,
    };
  }

  let conditionBreakdown = null;
  if (verbose) {
    conditionBreakdown = RE.evaluateRuleConditions(ruleDef.conditions, sampleData);
  }

  return {
    valid: true,
    ruleName: ruleDef.name,
    action: ruleDef.action,
    priority: ruleDef.priority,
    matched: result.matched,
    matchScore: result.matchScore,
    matchDetails: {
      allPassed: result.allResults ? result.allResults.every(r => r.passed) : true,
      anyPassed: result.anyResults ? result.anyResults.some(r => r.passed) : true,
      threshold: result.threshold,
      thresholdMet: result.thresholdMet,
    },
    threshold: result.threshold,
    thresholdMet: result.thresholdMet,
    conditionBreakdown,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Run multiple rules against sample data.
 * @param {Array} rules
 * @param {Object} data
 * @param {Object} options
 * @returns {Array}
 */
function runBatchSandbox(rules, data, options) {
  if (!Array.isArray(rules)) return [];
  return rules.map(rule => runSandbox(rule, data, options));
}

/**
 * Generate realistic mock data for sandbox testing.
 * @param {Object} overrides - Override specific fields
 * @returns {Object}
 */
function generateMockData(overrides) {
  const data = {
    transaction: {
      amount: 25000000,
      currency: 'IDR',
      type: 'transfer',
      timestamp: new Date().toISOString(),
    },
    sender: {
      id: 'user_abc123',
      name: 'John Doe',
      phone: '6281234567890',
      email: 'john@example.com',
      risk_score: 35,
      confidence_score: 70,
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
    recipient: {
      id: 'user_xyz789',
      name: 'Jane Smith',
      phone: '6289876543210',
      risk_score: 5,
      confidence_score: 90,
    },
    device: {
      id: 'device_001',
      fingerprint: 'fp_abc123',
      is_emulator: false,
      is_rooted: false,
      ip_address: '192.168.1.100',
    },
    ip_address: '192.168.1.100',
    amount: 25000000,
    currency: 'IDR',
    confidence_score: 75,
    relationships: [
      { type: 'same_device', target_id: 'user_def456', depth: 1 },
      { type: 'same_ip', target_id: 'user_ghi789', depth: 2 },
    ],
    events: [
      { type: 'login', timestamp: new Date(Date.now() - 300000).toISOString() },
      { type: 'transfer', timestamp: new Date(Date.now() - 120000).toISOString() },
    ],
  };

  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach(k => { data[k] = overrides[k]; });
  }

  return data;
}

module.exports = { runSandbox, runBatchSandbox, generateMockData };