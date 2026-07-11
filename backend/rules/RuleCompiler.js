// rules/RuleCompiler.js
// Compiles JSON rule definitions into executable condition chains.

const logger = require('../utils/logger');

const OPERATORS = {
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  eq: (a, b) => String(a) === String(b),
  neq: (a, b) => String(a) !== String(b),
  contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  regex: (a, b) => {
    try {
      const pattern = typeof b === 'object' ? b.pattern : b;
      const flags = typeof b === 'object' ? b.flags || '' : '';
      return new RegExp(pattern, flags).test(String(a));
    } catch (e) {
      logger.warn('Invalid regex in rule condition', e.message);
      return false;
    }
  },
  in: (a, b) => Array.isArray(b) && b.some(v => String(v) === String(a)),
  not_in: (a, b) => !Array.isArray(b) || !b.some(v => String(v) === String(a)),
};

const SUPPORTED_OPERATORS = Object.keys(OPERATORS);

function resolveField(data, fieldPath) {
  if (!data || typeof data !== 'object') return undefined;
  const parts = fieldPath.split('.');
  let current = data;
  for (let i = 0; i < parts.length; i++) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[parts[i]];
  }
  return current;
}

/**
 * Compile a single condition into an evaluator function.
 * @param {Object} condition - { field, operator, value }
 * @returns {Function} evaluator(data) => boolean
 */
function compileCondition(condition) {
  if (!condition || typeof condition !== 'object') {
    throw new Error('Invalid condition: must be an object');
  }
  const { field, operator, value } = condition;
  if (!field || typeof field !== 'string') {
    throw new Error('Condition field is required and must be a string');
  }
  if (!operator || !SUPPORTED_OPERATORS.includes(operator)) {
    throw new Error(`Unsupported operator: ${operator}. Supported: ${SUPPORTED_OPERATORS.join(', ')}`);
  }
  if (value === undefined || value === null) {
    throw new Error('Condition value is required');
  }
  const opFn = OPERATORS[operator];
  return function evaluateCondition(data) {
    const fieldValue = resolveField(data, field);
    return opFn(fieldValue, value);
  };
}

/**
 * Compile a full rule definition into an evaluator with threshold support.
 * @param {Object} ruleDef - { name, action, conditions: { all, any }, threshold }
 * @returns {Object} { evaluate(data) => { matched, matchScore, threshold, ... } }
 */
function compileRule(ruleDef) {
  if (!ruleDef || typeof ruleDef !== 'object') {
    throw new Error('Invalid rule definition: must be an object');
  }

  const conditions = ruleDef.conditions;
  const rawThreshold = ruleDef.threshold;

  if (!conditions || typeof conditions !== 'object') {
    throw new Error('Rule must have conditions object');
  }
  if (conditions.all !== undefined && !Array.isArray(conditions.all)) {
    throw new Error('conditions.all must be an array');
  }
  if (conditions.any !== undefined && !Array.isArray(conditions.any)) {
    throw new Error('conditions.any must be an array');
  }
  if (!conditions.all && !conditions.any) {
    throw new Error('Rule must have conditions.all or conditions.any');
  }

  const allConditions = (conditions.all || []).map(c => compileCondition(c));
  const anyConditions = (conditions.any || []).map(c => compileCondition(c));
  const threshold = rawThreshold !== undefined ? Number(rawThreshold) : undefined;

  return {
    evaluate: function evaluate(data) {
      const allResults = allConditions.map((fn, i) => ({
        index: i,
        condition: (conditions.all || [])[i],
        passed: fn(data),
      }));
      const anyResults = anyConditions.map((fn, i) => ({
        index: i,
        condition: (conditions.any || [])[i],
        passed: fn(data),
      }));

      const totalConditions = allConditions.length + anyConditions.length;
      const passedCount = allResults.filter(r => r.passed).length + anyResults.filter(r => r.passed).length;
      const matchScore = totalConditions > 0 ? Math.round((passedCount / totalConditions) * 100) / 100 : 1;
      const thresholdMet = threshold !== undefined ? matchScore >= threshold : true;

      // When threshold is set, use threshold-based matching (relaxed all/any)
      const matched = threshold !== undefined
        ? thresholdMet
        : (allConditions.length === 0 || allResults.every(r => r.passed)) &&
          (anyConditions.length === 0 || anyResults.some(r => r.passed));

      return {
        matched,
        matchScore,
        threshold,
        thresholdMet,
        allResults,
        anyResults,
      };
    },
  };
}

/**
 * Validate a rule definition.
 * @param {Object} ruleDef
 * @returns {Object} { valid, errors }
 */
function validateRuleDefinition(ruleDef) {
  const errors = [];
  if (!ruleDef || typeof ruleDef !== 'object') {
    errors.push('Rule definition must be an object');
    return { valid: false, errors };
  }
  if (!ruleDef.name || typeof ruleDef.name !== 'string') {
    errors.push('Rule name is required and must be a string');
  }
  if (!ruleDef.conditions || typeof ruleDef.conditions !== 'object') {
    errors.push('Rule must have a conditions object');
  } else {
    if (ruleDef.conditions.all) {
      if (!Array.isArray(ruleDef.conditions.all)) {
        errors.push('conditions.all must be an array');
      }
    }
    if (ruleDef.conditions.any) {
      if (!Array.isArray(ruleDef.conditions.any)) {
        errors.push('conditions.any must be an array');
      }
    }
  }
  if (ruleDef.action && !['ALLOW', 'WARNING', 'HIGH_RISK', 'BLOCK', 'MANUAL_REVIEW', 'A', 'W', 'H', 'B', 'M'].includes(ruleDef.action)) {
    errors.push(`Invalid action: ${ruleDef.action}`);
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  compileCondition,
  compileRule,
  validateRuleDefinition,
  resolveField,
  OPERATORS,
  SUPPORTED_OPERATORS,
};