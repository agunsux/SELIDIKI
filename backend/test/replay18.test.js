// test/replay18.test.js — Phase 18: Historical Intelligence Laboratory

const ScenarioLibrary = require('../replay/ScenarioLibrary');
const HistoricalAttackPlayer = require('../replay/HistoricalAttackPlayer');
const AttackSimulator = require('../replay/AttackSimulator');
const ReplayEngine = require('../replay/ReplayEngine');
const ExperimentRunner = require('../replay/ExperimentRunner');
const ExperimentRegistry = require('../replay/ExperimentRegistry');
const ReplayScenarioRepository = require('../replay/ReplayScenarioRepository');
const DecisionComparator = require('../replay/DecisionComparator');

describe('Phase 18 — Historical Intelligence Laboratory', () => {

  describe('ScenarioLibrary', () => {
    test('should return all 10 scenarios', () => {
      const all = ScenarioLibrary.getAll();
      expect(all.length).toBe(10);
    });
    test('should get by id', () => {
      const s = ScenarioLibrary.get('marketplace_scam');
      expect(s).toBeTruthy();
      expect(s.name).toBe('Marketplace Scam');
    });
    test('should return null for unknown', () => {
      expect(ScenarioLibrary.get('unknown')).toBeNull();
    });
    test('should list all IDs', () => {
      const ids = ScenarioLibrary.getIds();
      expect(ids).toContain('fake_bank');
      expect(ids).toContain('otp_theft');
    });
  });

  describe('HistoricalAttackPlayer', () => {
    test('should generate attack from scenario', () => {
      const attack = HistoricalAttackPlayer.generateAttack('marketplace_scam');
      expect(attack.entity_hash).toBeTruthy();
      expect(attack.events.length).toBeGreaterThan(0);
      expect(attack.actual_risk).toBeGreaterThanOrEqual(60);
    });
    test('should generate batch', () => {
      const batch = HistoricalAttackPlayer.generateBatch(['marketplace_scam', 'fake_bank'], 2);
      expect(batch.length).toBe(4);
    });
    test('should convert to ground truth', () => {
      const attacks = HistoricalAttackPlayer.generateBatch(['marketplace_scam'], 1);
      const gt = HistoricalAttackPlayer.toGroundTruth(attacks);
      expect(gt.length).toBe(1);
      expect(gt[0].source).toBe('historical_replay');
    });
  });

  describe('AttackSimulator', () => {
    test('should have static methods', () => {
      expect(typeof AttackSimulator.simulate).toBe('function');
      expect(typeof AttackSimulator.simulateBatch).toBe('function');
    });
  });

  describe('ReplayEngine', () => {
    test('should have static methods', () => {
      expect(typeof ReplayEngine.run).toBe('function');
      expect(typeof ReplayEngine.runCounterfactual).toBe('function');
      expect(typeof ReplayEngine.listExperiments).toBe('function');
    });
  });

  describe('ExperimentRunner', () => {
    test('should have static methods', () => {
      expect(typeof ExperimentRunner.run).toBe('function');
      expect(typeof ExperimentRunner.runLight).toBe('function');
      expect(typeof ExperimentRunner.runFull).toBe('function');
    });
  });

  describe('ExperimentRegistry', () => {
    test('should have static methods', () => {
      expect(typeof ExperimentRegistry.save).toBe('function');
      expect(typeof ExperimentRegistry.list).toBe('function');
      expect(typeof ExperimentRegistry.get).toBe('function');
    });
  });

  describe('ReplayScenarioRepository', () => {
    test('should have static methods', () => {
      expect(typeof ReplayScenarioRepository.save).toBe('function');
      expect(typeof ReplayScenarioRepository.list).toBe('function');
    });
  });

  describe('DecisionComparator', () => {
    test('should have static methods', () => {
      expect(typeof DecisionComparator.compareAgainstDecisionHistory).toBe('function');
      expect(typeof DecisionComparator.compareAgainstRiskEngine).toBe('function');
      expect(typeof DecisionComparator.findOptimalThreshold).toBe('function');
      expect(typeof DecisionComparator.computeDetectionDelay).toBe('function');
    });
  });

  describe('AttackPlayer integration', () => {
    test('scenario -> attack -> groundTruth consistency', () => {
      const attack = HistoricalAttackPlayer.generateAttack('otp_theft');
      expect(attack.scenario_id).toBe('otp_theft');
      const gt = HistoricalAttackPlayer.toGroundTruth([attack]);
      expect(gt[0].entityHash).toBe(attack.entity_hash);
      expect(gt[0].actualRisk).toBe(attack.actual_risk);
      expect(gt[0].actualCategory).toBe('otp_theft');
    });
  });
});