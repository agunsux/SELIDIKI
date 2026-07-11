// test/validation.test.js — Phase 17: Intelligence Validation Framework

const ConfusionMatrix = require('../validation/ConfusionMatrix');
const PredictionComparator = require('../validation/PredictionComparator');
const CalibrationAnalyzer = require('../validation/CalibrationAnalyzer');
const ThresholdOptimizer = require('../validation/ThresholdOptimizer');
const ValidationReportGenerator = require('../validation/ValidationReportGenerator');
const GroundTruthRepository = require('../validation/GroundTruthRepository');
const ValidationDatasetLoader = require('../validation/ValidationDatasetLoader');

// actualRisk: 1 = SAFE (negative), 100 = FRAUD (positive)
// predictedRisk: <50 = predicted safe, >=50 = predicted fraud
const PERFECT_PREDICTIONS = [
  { predictedRisk: 90, actualRisk: 100 },
  { predictedRisk: 85, actualRisk: 100 },
  { predictedRisk: 10, actualRisk: 1 },
  { predictedRisk: 5, actualRisk: 1 },
  { predictedRisk: 95, actualRisk: 100 },
  { predictedRisk: 15, actualRisk: 1 },
  { predictedRisk: 80, actualRisk: 100 },
  { predictedRisk: 20, actualRisk: 1 },
  { predictedRisk: 70, actualRisk: 100 },
  { predictedRisk: 30, actualRisk: 1 },
];

describe('Phase 17 — Intelligence Validation Framework', () => {

  describe('ConfusionMatrix', () => {
    test('perfect predictions', () => {
      const cm = ConfusionMatrix.compute(PERFECT_PREDICTIONS, 50);
      expect(cm.tp).toBe(5); expect(cm.tn).toBe(5);
      expect(cm.fp).toBe(0); expect(cm.fn).toBe(0);
      expect(cm.accuracy).toBe(1); expect(cm.precision).toBe(1);
      expect(cm.recall).toBe(1); expect(cm.f1).toBe(1);
    });
    test('poor predictions', () => {
      const p = [{ predictedRisk: 95, actualRisk: 5 }, { predictedRisk: 5, actualRisk: 95 }];
      const cm = ConfusionMatrix.compute(p, 50);
      expect(cm.fp).toBe(1); expect(cm.fn).toBe(1);
      expect(cm.accuracy).toBe(0);
    });
    test('ROC curve 21 points', () => {
      const curve = ConfusionMatrix.computeROCCurve(PERFECT_PREDICTIONS);
      expect(curve.length).toBe(21);
    });
    test('AUC > 0.5 for perfect', () => {
      const auc = ConfusionMatrix.computeAUC(PERFECT_PREDICTIONS);
      expect(auc).toBeGreaterThan(0.5);
    });
    test('PR curve length', () => {
      const pr = ConfusionMatrix.computePRCurve(PERFECT_PREDICTIONS);
      expect(pr.length).toBe(21);
    });
  });

  describe('PredictionComparator', () => {
    test('align by entity hash', () => {
      const preds = [{ entityHash: 'a', predictedRisk: 80 }, { entityHash: 'b', predictedRisk: 20 }];
      const gt = [{ entity_hash: 'a', actual_risk: 90 }, { entity_hash: 'b', actual_risk: 10 }];
      const a = PredictionComparator.align(preds, gt);
      expect(a.length).toBe(2);
      expect(a.find(x => x.entityHash === 'a').delta).toBe(10);
    });
    test('compare returns metrics', () => {
      const a = PredictionComparator.align(
        [{ entityHash: 'x', predictedRisk: 85 }],
        [{ entity_hash: 'x', actual_risk: 90 }]
      );
      const r = PredictionComparator.compare(a);
      expect(r.total).toBe(1);
      expect(r.confusion_matrix).toBeDefined();
      expect(r.accuracy).toBe(1);
    });
    test('empty returns error', () => {
      const r = PredictionComparator.compare([]);
      expect(r.error).toBeDefined();
    });
  });

  describe('CalibrationAnalyzer', () => {
    test('computes bins', () => {
      const r = CalibrationAnalyzer.analyze(PERFECT_PREDICTIONS);
      expect(r.bins.length).toBeGreaterThan(0);
      expect(r.brier_score).toBeGreaterThanOrEqual(0);
    });
    test('empty returns error', () => {
      const r = CalibrationAnalyzer.analyze([]);
      expect(r.error).toBeDefined();
    });
  });

  describe('ThresholdOptimizer', () => {
    test('maximize F1', () => {
      const r = ThresholdOptimizer.maximize(PERFECT_PREDICTIONS, 'f1');
      expect(r.threshold).toBeGreaterThanOrEqual(5);
      expect(r.metricValue).toBe(1);
    });
    test('threshold sweep', () => {
      const s = ThresholdOptimizer.thresholdSweep(PERFECT_PREDICTIONS);
      expect(s.length).toBe(5);
      expect(s[0].threshold).toBe(30);
      expect(s[4].threshold).toBe(70);
    });
    test('find for precision', () => {
      const r = ThresholdOptimizer.findThresholdForPrecision(PERFECT_PREDICTIONS, 0.9);
      expect(r.threshold).toBeGreaterThanOrEqual(5);
    });
  });

  describe('ValidationReportGenerator', () => {
    const aligned = PredictionComparator.align(
      [{ entityHash: 'x', predictedRisk: 85 }],
      [{ entity_hash: 'x', actual_risk: 90 }]
    );
    test('generate report', () => {
      const r = ValidationReportGenerator.generate(aligned);
      expect(r.classification_metrics).toBeDefined();
      expect(r.calibration_metrics).toBeDefined();
      expect(r.optimal_threshold).toBeDefined();
      expect(r.roc_curve).toBeDefined();
    });
    test('toCSV', () => {
      const c = ValidationReportGenerator.toCSV(aligned);
      expect(c).toContain('accuracy');
    });
    test('toMarkdown', () => {
      const m = ValidationReportGenerator.toMarkdown(aligned);
      expect(m).toContain('## Classification Metrics');
    });
    test('toJSON', () => {
      const j = ValidationReportGenerator.toJSON(PERFECT_PREDICTIONS);
      expect(j).toContain('predictions');
    });
  });

  describe('Repository interfaces', () => {
    test('GroundTruthRepository', () => {
      expect(typeof GroundTruthRepository.load).toBe('function');
      expect(typeof GroundTruthRepository.getByEntity).toBe('function');
    });
    test('ValidationDatasetLoader', () => {
      expect(typeof ValidationDatasetLoader.loadSyntheticDataset).toBe('function');
      expect(typeof ValidationDatasetLoader.loadPredictions).toBe('function');
    });
  });

  describe('Integration end-to-end', () => {
    test('perfect predictions flow', () => {
      const aligned = PredictionComparator.align(
        PERFECT_PREDICTIONS.map((p, i) => ({
          entityHash: `e${i}`, predictedRisk: p.predictedRisk,
        })),
        PERFECT_PREDICTIONS.map((p, i) => ({
          entity_hash: `e${i}`, actual_risk: p.actualRisk,
        }))
      );
      expect(aligned.length).toBe(10);
      const cmp = PredictionComparator.compare(aligned);
      expect(cmp.accuracy).toBe(1);
      expect(cmp.f1).toBe(1);
      expect(ThresholdOptimizer.maximize(aligned, 'f1').metricValue).toBe(1);
      const rpt = ValidationReportGenerator.generate(aligned);
      expect(rpt.classification_metrics.accuracy).toBe(1);
    });
  });
});