// test/intelligence.test.js
// Comprehensive unit tests for all intelligence layers (Phase A through Phase F)

const FraudDataCollector = require('../data/FraudDataCollector');
const LookupEventCollector = require('../data/LookupEventCollector');
const EvidenceCollector = require('../data/EvidenceCollector');
const DatasetVersionManager = require('../data/DatasetVersionManager');
const TrainingDatasetExporter = require('../data/TrainingDatasetExporter');
const BurstDetector = require('../velocity/BurstDetector');
const TrendAnalyzer = require('../velocity/TrendAnalyzer');
const AlertThresholdEngine = require('../velocity/AlertThresholdEngine');
const VerificationWorkflow = require('../moderation/VerificationWorkflow');
const EvidenceScoringService = require('../trust/EvidenceScoringService');

// ── Phase A: Data Intelligence Layer Tests ──

describe('Phase A — Data Intelligence Layer', () => {

  describe('FraudDataCollector', () => {
    test('should have static collectReportEvent method', () => {
      expect(typeof FraudDataCollector.collectReportEvent).toBe('function');
    });

    test('should have static getEventsByHash method', () => {
      expect(typeof FraudDataCollector.getEventsByHash).toBe('function');
    });

    test('should have static getEventsByType method', () => {
      expect(typeof FraudDataCollector.getEventsByType).toBe('function');
    });

    test('should have static countEventsByHash method', () => {
      expect(typeof FraudDataCollector.countEventsByHash).toBe('function');
    });

    test('should have _ensureTable static method', () => {
      expect(typeof FraudDataCollector._ensureTable).toBe('function');
    });
  });

  describe('LookupEventCollector', () => {
    test('should have static recordLookup method', () => {
      expect(typeof LookupEventCollector.recordLookup).toBe('function');
    });

    test('should have static getLookupsByHash method', () => {
      expect(typeof LookupEventCollector.getLookupsByHash).toBe('function');
    });

    test('should have static getLookupStats method', () => {
      expect(typeof LookupEventCollector.getLookupStats).toBe('function');
    });

    test('should have static _ensureTable method', () => {
      expect(typeof LookupEventCollector._ensureTable).toBe('function');
    });
  });

  describe('EvidenceCollector', () => {
    test('should have static storeEvidence method', () => {
      expect(typeof EvidenceCollector.storeEvidence).toBe('function');
    });

    test('should have static getEvidenceByReport method', () => {
      expect(typeof EvidenceCollector.getEvidenceByReport).toBe('function');
    });

    test('should have static updateVerificationStatus method', () => {
      expect(typeof EvidenceCollector.updateVerificationStatus).toBe('function');
    });

    test('should have static countByStatus method', () => {
      expect(typeof EvidenceCollector.countByStatus).toBe('function');
    });
  });

  describe('DatasetVersionManager', () => {
    test('should have static createVersion method', () => {
      expect(typeof DatasetVersionManager.createVersion).toBe('function');
    });

    test('should have static publishVersion method', () => {
      expect(typeof DatasetVersionManager.publishVersion).toBe('function');
    });

    test('should have static getLatestPublished method', () => {
      expect(typeof DatasetVersionManager.getLatestPublished).toBe('function');
    });

    test('should have static listVersions method', () => {
      expect(typeof DatasetVersionManager.listVersions).toBe('function');
    });

    test('should have static exportVersion method', () => {
      expect(typeof DatasetVersionManager.exportVersion).toBe('function');
    });
  });

  describe('TrainingDatasetExporter', () => {
    test('should have static exportForTraining method', () => {
      expect(typeof TrainingDatasetExporter.exportForTraining).toBe('function');
    });

    test('should have static getDatasetStats method', () => {
      expect(typeof TrainingDatasetExporter.getDatasetStats).toBe('function');
    });

    test('should have static exportFlat method', () => {
      expect(typeof TrainingDatasetExporter.exportFlat).toBe('function');
    });

    describe('_extractFeatures', () => {
      test('should return correct feature vector', () => {
        const features = TrainingDatasetExporter._extractFeatures({
          evidence_count: '5',
          lookup_count: '10',
          reporter_hash: 'abc',
          entity_type: 'phone',
          confidence: '75',
        });
        expect(features).toEqual({
          evidence_count: 5,
          lookup_count: 10,
          has_reporter: 1,
          entity_type_phone: 1,
          entity_type_account: 0,
          entity_type_domain: 0,
          confidence_score: 75,
        });
      });

      test('should handle missing fields', () => {
        const features = TrainingDatasetExporter._extractFeatures({});
        expect(features.evidence_count).toBe(0);
        expect(features.has_reporter).toBe(0);
      });
    });

    describe('_extractLabel', () => {
      test('should extract risk_score by default', () => {
        expect(TrainingDatasetExporter._extractLabel({ risk_score: '85' }, 'risk_score')).toBe(85);
      });

      test('should extract category when specified', () => {
        expect(TrainingDatasetExporter._extractLabel({ category: 'phishing' }, 'category')).toBe('phishing');
      });
    });
  });
});

// ── Phase B: Graph Engine Tests (interface contracts) ──

describe('Phase B — Graph Engine', () => {
  test('GraphBuilder module should be loadable', () => {
    const GraphBuilder = require('../graph/GraphBuilder');
    expect(typeof GraphBuilder.addNode).toBe('function');
    expect(typeof GraphBuilder.addEdge).toBe('function');
    expect(typeof GraphBuilder.getNode).toBe('function');
    expect(typeof GraphBuilder.getNodeEdges).toBe('function');
    expect(typeof GraphBuilder.deleteNode).toBe('function');
  });

  test('GraphRepository module should be loadable', () => {
    const GraphRepository = require('../graph/GraphRepository');
    expect(typeof GraphRepository.findNodesByType).toBe('function');
    expect(typeof GraphRepository.findEdgesByRelationship).toBe('function');
    expect(typeof GraphRepository.getEdgesForNodes).toBe('function');
    expect(typeof GraphRepository.getConnectedNodes).toBe('function');
    expect(typeof GraphRepository.countByType).toBe('function');
    expect(typeof GraphRepository.batchInsertNodes).toBe('function');
    expect(typeof GraphRepository.batchInsertEdges).toBe('function');
  });

  test('RelationshipResolver module should be loadable', () => {
    const RelationshipResolver = require('../graph/RelationshipResolver');
    expect(typeof RelationshipResolver.resolveFromEvent).toBe('function');
    expect(typeof RelationshipResolver.linkPhoneToBank).toBe('function');
    expect(typeof RelationshipResolver.linkPhoneToDomain).toBe('function');
    expect(typeof RelationshipResolver.linkPhoneToDevice).toBe('function');
    expect(typeof RelationshipResolver.linkBankToCase).toBe('function');
    expect(typeof RelationshipResolver.linkDomainToCase).toBe('function');
    expect(typeof RelationshipResolver.getPhoneRelationships).toBe('function');
  });

  test('EntityClusterService module should be loadable', () => {
    const EntityClusterService = require('../graph/EntityClusterService');
    expect(typeof EntityClusterService.findConnectedEntities).toBe('function');
    expect(typeof EntityClusterService.findShortestPath).toBe('function');
    expect(typeof EntityClusterService.findFraudCluster).toBe('function');
    expect(typeof EntityClusterService.calculateClusterRisk).toBe('function');
  });

  test('GraphQueryService module should be loadable', () => {
    const GraphQueryService = require('../graph/GraphQueryService');
    expect(typeof GraphQueryService.getEntityGraphSummary).toBe('function');
    expect(typeof GraphQueryService.getGraphSummary).toBe('function');
    expect(typeof GraphQueryService.searchNodes).toBe('function');
    expect(typeof GraphQueryService.getGraphStatistics).toBe('function');
  });
});

// ── Phase C: Community Trust Engine Tests ──

describe('Phase C — Community Trust Engine', () => {
  test('CommunityConfidenceService should be loadable', () => {
    const CommunityConfidenceService = require('../trust/CommunityConfidenceService');
    expect(typeof CommunityConfidenceService.calculateConfidence).toBe('function');
    expect(typeof CommunityConfidenceService.getGeographicDiversity).toBe('function');
  });

  test('ReporterReputationService should be loadable', () => {
    const ReporterReputationService = require('../trust/ReporterReputationService');
    expect(typeof ReporterReputationService.calculateReputation).toBe('function');
    expect(typeof ReporterReputationService.getReporterHistory).toBe('function');
    expect(typeof ReporterReputationService.recordFalseReport).toBe('function');
  });

  test('EvidenceScoringService should be loadable', () => {
    expect(typeof EvidenceScoringService.scoreEvidence).toBe('function');
    expect(typeof EvidenceScoringService.calculateTimeDecay).toBe('function');
    expect(typeof EvidenceScoringService.classifyQuality).toBe('function');
    expect(typeof EvidenceScoringService.scoreWithTimeDecay).toBe('function');
  });

  describe('EvidenceScoringService.calculateTimeDecay', () => {
    test('should return 1.0 for recent evidence (<= 7 days)', () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      expect(EvidenceScoringService.calculateTimeDecay(recentDate)).toBe(1.0);
    });

    test('should return 0.8 for evidence within 30 days', () => {
      const date = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      expect(EvidenceScoringService.calculateTimeDecay(date)).toBe(0.8);
    });

    test('should return 0.5 for evidence within 90 days', () => {
      const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      expect(EvidenceScoringService.calculateTimeDecay(date)).toBe(0.5);
    });

    test('should return 0.2 for old evidence (> 90 days)', () => {
      const date = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
      expect(EvidenceScoringService.calculateTimeDecay(date)).toBe(0.2);
    });
  });

  describe('EvidenceScoringService.classifyQuality', () => {
    test('should classify >= 80 as strong', () => {
      expect(EvidenceScoringService.classifyQuality(85)).toBe('strong');
    });

    test('should classify 50-79 as moderate', () => {
      expect(EvidenceScoringService.classifyQuality(60)).toBe('moderate');
    });

    test('should classify 20-49 as weak', () => {
      expect(EvidenceScoringService.classifyQuality(30)).toBe('weak');
    });

    test('should classify < 20 as insufficient', () => {
      expect(EvidenceScoringService.classifyQuality(10)).toBe('insufficient');
    });
  });

  test('TrustScoreCalculator should be loadable', () => {
    const TrustScoreCalculator = require('../trust/TrustScoreCalculator');
    expect(typeof TrustScoreCalculator.calculateTrust).toBe('function');
  });
});

// ── Phase D: Velocity Detection Tests ──

describe('Phase D — Velocity Detection', () => {

  describe('BurstDetector', () => {
    test('should detect burst when reports exceed threshold', () => {
      const detector = new BurstDetector({ threshold: 5 });
      const result = detector.detect(10, 2);
      expect(result.is_burst).toBe(true);
      expect(result.burst_score).toBeGreaterThanOrEqual(30);
    });

    test('should not detect burst when below threshold', () => {
      const detector = new BurstDetector({ threshold: 5 });
      const result = detector.detect(3, 2);
      expect(result.is_burst).toBe(false);
    });

    test('should allow runtime configuration', () => {
      const detector = new BurstDetector({ threshold: 10 });
      expect(detector.threshold).toBe(10);
      detector.configure({ threshold: 20 });
      expect(detector.threshold).toBe(20);
    });

    test('should classify severity correctly', () => {
      const detector = new BurstDetector({ threshold: 5 });
      const low = detector.detect(5, 2);
      const high = detector.detect(25, 2);
      expect(low.severity).toBe('medium');
      expect(high.severity).toBe('critical');
    });
  });

  describe('TrendAnalyzer', () => {
    test('should detect escalating trend when increase >= 50%', () => {
      const result = TrendAnalyzer.analyze(150, 100);
      expect(result.trend).toBe('escalating');
      expect(result.direction).toBe('rapidly_increasing');
    });

    test('should detect rising trend when increase >= 20%', () => {
      const result = TrendAnalyzer.analyze(120, 100);
      expect(result.trend).toBe('rising');
    });

    test('should detect stable trend when change is small', () => {
      const result = TrendAnalyzer.analyze(55, 50);
      expect(result.trend).toBe('neutral');
      expect(result.direction).toBe('stable');
    });

    test('should handle zero previous period', () => {
      const result = TrendAnalyzer.analyze(10, 0);
      expect(result.change_percent).toBe(100);
    });

    describe('classifySeverity', () => {
      test('should return critical for escalating + high volume', () => {
        expect(TrendAnalyzer.classifySeverity('escalating', 25)).toBe('critical');
      });

      test('should return low for neutral + low volume', () => {
        expect(TrendAnalyzer.classifySeverity('neutral', 2)).toBe('low');
      });
    });

    describe('analyzeProvinceDistribution', () => {
      test('should detect concentration when one province >= 50%', () => {
        const data = [
          { province: 'Jakarta', count: 80 },
          { province: 'Jabar', count: 20 },
        ];
        const result = TrendAnalyzer.analyzeProvinceDistribution(data);
        expect(result.concentration.is_concentrated).toBe(true);
        expect(result.concentration.dominant_province).toBe('Jakarta');
      });
    });
  });

  describe('AlertThresholdEngine', () => {
    test('should generate alerts for exceeded thresholds', () => {
      const engine = new AlertThresholdEngine({ reportsPerHour: 10 });
      const result = engine.evaluate({
        reportsPerHour: 20, reportsPerDay: 5, reportsPerWeek: 10,
        uniqueReporters: 2, uniqueDevices: 1, burstScore: 10, velocityScore: 10,
      });
      expect(result.is_alerting).toBe(true);
      expect(result.total_alerts).toBeGreaterThanOrEqual(1);
      expect(result.alerts[0].type).toBe('reports_per_hour');
    });

    test('should not generate alerts when within thresholds', () => {
      const engine = new AlertThresholdEngine({ reportsPerHour: 50 });
      const result = engine.evaluate({
        reportsPerHour: 5, reportsPerDay: 5, reportsPerWeek: 10,
        uniqueReporters: 1, uniqueDevices: 1, burstScore: 10, velocityScore: 10,
      });
      expect(result.is_alerting).toBe(false);
    });

    test('should allow runtime threshold updates', () => {
      const engine = new AlertThresholdEngine();
      engine.updateThresholds({ reportsPerDay: 100 });
      expect(engine.getThresholds().reportsPerDay).toBe(100);
    });
  });
});

// ── Phase E: Moderation Pipeline Tests ──

describe('Phase E — Moderation Pipeline', () => {

  describe('VerificationWorkflow', () => {
    test('should validate valid transitions', () => {
      expect(VerificationWorkflow.validateTransition('pending', 'verified').valid).toBe(true);
      expect(VerificationWorkflow.validateTransition('pending', 'rejected').valid).toBe(true);
      expect(VerificationWorkflow.validateTransition('needs_more_evidence', 'appealed').valid).toBe(true);
    });

    test('should reject invalid transitions', () => {
      expect(VerificationWorkflow.validateTransition('verified', 'pending').valid).toBe(false);
      expect(VerificationWorkflow.validateTransition('rejected', 'verified').valid).toBe(false);
      expect(VerificationWorkflow.validateTransition('pending', 'invalid').valid).toBe(false);
    });

    test('should reject appeal directly from pending', () => {
      const result = VerificationWorkflow.validateTransition('pending', 'appealed');
      expect(result.valid).toBe(false);
    });

    test('isTerminal should identify terminal states', () => {
      expect(VerificationWorkflow.isTerminal('verified')).toBe(true);
      expect(VerificationWorkflow.isTerminal('rejected')).toBe(true);
      expect(VerificationWorkflow.isTerminal('pending')).toBe(false);
    });

    test('getNextStates should return possible transitions', () => {
      const next = VerificationWorkflow.getNextStates('pending');
      expect(next).toContain('verified');
      expect(next).toContain('rejected');
    });

    test('getStateMachine should return full definition', () => {
      const sm = VerificationWorkflow.getStateMachine();
      expect(sm.states).toContain('pending');
      expect(sm.states).toContain('verified');
      expect(sm.states).toContain('rejected');
      expect(sm.terminal).toContain('verified');
    });
  });

  test('ModerationQueue module should be loadable', () => {
    const ModerationQueue = require('../moderation/ModerationQueue');
    expect(typeof ModerationQueue.enqueue).toBe('function');
    expect(typeof ModerationQueue.dequeue).toBe('function');
    expect(typeof ModerationQueue.updateStatus).toBe('function');
    expect(typeof ModerationQueue.getStats).toBe('function');
    expect(typeof ModerationQueue.list).toBe('function');
  });

  test('EvidenceReviewService module should be loadable', () => {
    const EvidenceReviewService = require('../moderation/EvidenceReviewService');
    expect(typeof EvidenceReviewService.reviewEvidence).toBe('function');
    expect(typeof EvidenceReviewService.getReviewHistory).toBe('function');
    expect(typeof EvidenceReviewService.getPendingReviews).toBe('function');
    expect(typeof EvidenceReviewService.getReviewSummary).toBe('function');
    expect(typeof EvidenceReviewService.getEvidenceWithScore).toBe('function');
  });

  test('AppealService module should be loadable', () => {
    const AppealService = require('../moderation/AppealService');
    expect(typeof AppealService.submitAppeal).toBe('function');
    expect(typeof AppealService.reviewAppeal).toBe('function');
    expect(typeof AppealService.getPendingAppeals).toBe('function');
    expect(typeof AppealService.getAppealStats).toBe('function');
  });
});

// ── Phase F: Intelligence API Tests ──

describe('Phase F — Intelligence API Layer', () => {
  test('Intelligence routes module should be loadable', () => {
    const intelligenceRoutes = require('../routes/intelligence');
    expect(intelligenceRoutes).toBeDefined();
    expect(typeof intelligenceRoutes).toBe('function');
  });
});

// ── Integration: Cross-layer interaction tests ──

describe('Cross-layer Integration', () => {
  test('BurstDetector and AlertThresholdEngine should work together', () => {
    const detector = new BurstDetector({ threshold: 5 });
    const engine = new AlertThresholdEngine({ burstScoreMin: 30 });

    const burstResult = detector.detect(15, 3);
    const alertResult = engine.evaluate({
      reportsPerHour: 15, reportsPerDay: 30, reportsPerWeek: 100,
      uniqueReporters: 3, uniqueDevices: 2,
      burstScore: burstResult.burst_score,
      velocityScore: 60,
    });

    expect(burstResult.is_burst).toBe(true);
    expect(alertResult.is_alerting).toBe(true);
  });

  test('EvidenceScoring quality should chain with classification', () => {
    const quality1 = EvidenceScoringService.classifyQuality(90);
    const quality2 = EvidenceScoringService.classifyQuality(45);
    expect(quality1).toBe('strong');
    expect(quality2).toBe('weak');
  });

  test('VerificationWorkflow should reject any transition from terminal states', () => {
    expect(VerificationWorkflow.validateTransition('verified', 'appealed').valid).toBe(false);
    expect(VerificationWorkflow.validateTransition('rejected', 'appealed').valid).toBe(false);
  });
});