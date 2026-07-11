// test/decision8.test.js — Sprint 8.3: Decision Intelligence Engine

const DecisionEngine = require('../decision/DecisionEngine');
const DecisionRepository = require('../decision/DecisionRepository');
const RecommendationService = require('../decision/RecommendationService');
const ActionResolver = require('../decision/ActionResolver');
const DecisionAuditService = require('../decision/DecisionAuditService');

describe('Sprint 8.3 — Decision Intelligence Engine', () => {
  describe('DecisionEngine', () => {
    test('should have static evaluate method', () => { expect(typeof DecisionEngine.evaluate).toBe('function'); });
    test('should return SAFE for low risk', () => {
      const r = DecisionEngine.evaluate({ riskScore: 10, confidence: 80, velocityScore: 10, trustScore: 85, ruleOutput: [] });
      expect(r.decision).toBe('SAFE');
    });
    test('should return LOW_RISK for moderate risk', () => {
      const r = DecisionEngine.evaluate({ riskScore: 40, confidence: 60, velocityScore: 30, trustScore: 50, ruleOutput: [] });
      expect(r.decision).toBe('LOW_RISK');
    });
    test('should return MEDIUM_RISK for medium risk', () => {
      const r = DecisionEngine.evaluate({ riskScore: 50, confidence: 60, velocityScore: 55, trustScore: 50, ruleOutput: [] });
      expect(r.decision).toBe('MEDIUM_RISK');
    });
    test('should return HIGH_RISK for high risk + velocity', () => {
      const r = DecisionEngine.evaluate({ riskScore: 70, confidence: 60, velocityScore: 70, trustScore: 30, ruleOutput: [] });
      expect(r.decision).toBe('HIGH_RISK');
    });
    test('should return MANUAL_REVIEW for high risk + low confidence', () => {
      const r = DecisionEngine.evaluate({ riskScore: 70, confidence: 20, velocityScore: 30, trustScore: 30, ruleOutput: [] });
      expect(r.decision).toBe('MANUAL_REVIEW');
    });
    test('should return BLOCK for risk >= 80 + confidence >= 40', () => {
      const r = DecisionEngine.evaluate({ riskScore: 85, confidence: 50, velocityScore: 30, trustScore: 20, ruleOutput: [] });
      expect(r.decision).toBe('BLOCK');
    });
    test('should include reasons and recommended_action', () => {
      const r = DecisionEngine.evaluate({ riskScore: 85, confidence: 50, velocityScore: 30 });
      expect(r.reasons.length).toBeGreaterThan(0);
      expect(r.recommended_action).toBeTruthy();
    });
    test('should include score and confidence', () => {
      const r = DecisionEngine.evaluate({ riskScore: 50 });
      expect(typeof r.score).toBe('number');
      expect(typeof r.confidence).toBe('number');
    });
    test('should include triggered_rules when rules fire', () => {
      const r = DecisionEngine.evaluate({ riskScore: 40, ruleOutput: [{ name: 'test', action: 'WARNING', matchScore: 0.8 }] });
      expect(r.triggered_rules.length).toBe(1);
    });
  });

  describe('DecisionRepository', () => {
    test('should have static save method', () => { expect(typeof DecisionRepository.save).toBe('function'); });
    test('should have static findByEntity method', () => { expect(typeof DecisionRepository.findByEntity).toBe('function'); });
    test('should have static getStats method', () => { expect(typeof DecisionRepository.getStats).toBe('function'); });
    test('should have static _ensureTable method', () => { expect(typeof DecisionRepository._ensureTable).toBe('function'); });
  });

  describe('RecommendationService', () => {
    test('should generate recommendation for each decision type', () => {
      for (const dt of ['SAFE', 'LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'BLOCK', 'MANUAL_REVIEW']) {
        const r = RecommendationService.generate(dt, { score: 50, confidence: 70 });
        expect(r.action).toBeTruthy();
        expect(r.message).toBeTruthy();
        expect(r.urgency).toBeTruthy();
      }
    });
    test('should include score and confidence', () => {
      const r = RecommendationService.generate('HIGH_RISK', { score: 75, confidence: 60 });
      expect(r.score).toBe(75);
      expect(r.confidence).toBe(60);
    });
  });

  describe('ActionResolver', () => {
    test('should resolve all decision types', () => {
      expect(ActionResolver.resolve('SAFE').action).toBe('allow');
      expect(ActionResolver.resolve('BLOCK').action).toBe('block');
      expect(ActionResolver.resolve('HIGH_RISK').notify).toContain('security');
    });
    test('resolveHighestPriority returns highest', () => {
      const r = ActionResolver.resolveHighestPriority(['SAFE', 'BLOCK', 'MEDIUM_RISK']);
      expect(r.action).toBe('block');
    });
    test('resolveHighestPriority returns SAFE for empty', () => {
      const r = ActionResolver.resolveHighestPriority([]);
      expect(r.action).toBe('allow');
    });
  });

  describe('DecisionAuditService', () => {
    test('should have static log method', () => { expect(typeof DecisionAuditService.log).toBe('function'); });
    test('should have static query method', () => { expect(typeof DecisionAuditService.query).toBe('function'); });
    test('should have static export method', () => { expect(typeof DecisionAuditService.export).toBe('function'); });
    test('should have static _ensureTable method', () => { expect(typeof DecisionAuditService._ensureTable).toBe('function'); });
  });
});