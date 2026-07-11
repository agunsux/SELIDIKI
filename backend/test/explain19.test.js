// test/explain19.test.js — Phase 19: Explainability Platform

const ExplanationEngine = require('../explain/ExplanationEngine');
const DecisionExplainer = require('../explain/DecisionExplainer');
const RuleExplainer = require('../explain/RuleExplainer');
const TimelineExplainer = require('../explain/TimelineExplainer');
const GraphExplainer = require('../explain/GraphExplainer');
const EvidenceExplainer = require('../explain/EvidenceExplainer');
const ConfidenceExplainer = require('../explain/ConfidenceExplainer');

describe('Phase 19 — Explainability Platform', () => {
  describe('ExplanationEngine', () => {
    test('should have static explain method', () => { expect(typeof ExplanationEngine.explain).toBe('function'); });
  });
  describe('DecisionExplainer', () => {
    test('should have static explain method', () => { expect(typeof DecisionExplainer.explain).toBe('function'); });
  });
  describe('RuleExplainer', () => {
    test('should have static explain method', () => { expect(typeof RuleExplainer.explain).toBe('function'); });
  });
  describe('TimelineExplainer', () => {
    test('should have static explain method', () => { expect(typeof TimelineExplainer.explain).toBe('function'); });
  });
  describe('GraphExplainer', () => {
    test('should have static explain method', () => { expect(typeof GraphExplainer.explain).toBe('function'); });
  });
  describe('EvidenceExplainer', () => {
    test('should have static explain method', () => { expect(typeof EvidenceExplainer.explain).toBe('function'); });
  });
  describe('ConfidenceExplainer', () => {
    test('should explain based on confidence score', () => {
      const r = ConfidenceExplainer.explain('hash', { confidence: 85 });
      expect(r.level).toBe('high');
    });
    test('should return low for low confidence', () => {
      const r = ConfidenceExplainer.explain('hash', { confidence: 20 });
      expect(r.level).toBe('low');
    });
  });
});