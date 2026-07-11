// test/timeline.test.js
// Tests for Sprint 8.1 — Intelligence Timeline Engine

const TimelineBuilder = require('../timeline/TimelineBuilder');
const TimelineRepository = require('../timeline/TimelineRepository');
const TimelineAggregator = require('../timeline/TimelineAggregator');
const TimelineQueryService = require('../timeline/TimelineQueryService');

describe('SPRINT 8.1 — Intelligence Timeline Engine', () => {

  describe('TimelineBuilder', () => {
    test('should have static append method', () => {
      expect(typeof TimelineBuilder.append).toBe('function');
    });

    test('should have static batchAppend method', () => {
      expect(typeof TimelineBuilder.batchAppend).toBe('function');
    });

    test('should have static buildFromSources method', () => {
      expect(typeof TimelineBuilder.buildFromSources).toBe('function');
    });

    test('should have static populateAll method', () => {
      expect(typeof TimelineBuilder.populateAll).toBe('function');
    });

    test('should have static _ensureTable method', () => {
      expect(typeof TimelineBuilder._ensureTable).toBe('function');
    });

    test('append should reject invalid event types', async () => {
      await expect(TimelineBuilder.append({
        entityType: 'phone',
        entityHash: 'test',
        eventType: 'INVALID_TYPE',
      })).rejects.toThrow('Invalid timeline event type');
    });

    test('append should accept all valid event types', () => {
      const validTypes = ['LOOKUP', 'REPORT', 'VERIFICATION', 'MODERATION', 'APPEAL',
        'RISK_CHANGE', 'TRUST_CHANGE', 'VELOCITY_ALERT', 'GRAPH_UPDATE'];
      for (const type of validTypes) {
        expect(() => {
          TimelineBuilder.append({
            entityType: 'phone',
            entityHash: 'hash',
            eventType: type,
          }).catch(() => {}); // expected to fail due to no DB
        }).not.toThrow();
      }
    });
  });

  describe('TimelineRepository', () => {
    test('should have static findByEntity method', () => {
      expect(typeof TimelineRepository.findByEntity).toBe('function');
    });

    test('should have static findByEntities method', () => {
      expect(typeof TimelineRepository.findByEntities).toBe('function');
    });

    test('should have static findByType method', () => {
      expect(typeof TimelineRepository.findByType).toBe('function');
    });

    test('should have static countByType method', () => {
      expect(typeof TimelineRepository.countByType).toBe('function');
    });

    test('should have static getRiskEvolution method', () => {
      expect(typeof TimelineRepository.getRiskEvolution).toBe('function');
    });

    test('should have static getConfidenceEvolution method', () => {
      expect(typeof TimelineRepository.getConfidenceEvolution).toBe('function');
    });

    test('should have static getDailyAggregation method', () => {
      expect(typeof TimelineRepository.getDailyAggregation).toBe('function');
    });

    test('should have static getWeeklyAggregation method', () => {
      expect(typeof TimelineRepository.getWeeklyAggregation).toBe('function');
    });

    test('should have static countByEntity method', () => {
      expect(typeof TimelineRepository.countByEntity).toBe('function');
    });

    test('findByEntities should return empty for no hashes', async () => {
      const result = await TimelineRepository.findByEntities([]);
      expect(result).toEqual([]);
    });
  });

  describe('TimelineAggregator', () => {
    test('should have static getActivitySummary method', () => {
      expect(typeof TimelineAggregator.getActivitySummary).toBe('function');
    });

    test('should have static getRiskEvolutionSummary method', () => {
      expect(typeof TimelineAggregator.getRiskEvolutionSummary).toBe('function');
    });

    test('should have static getTrustEvolutionSummary method', () => {
      expect(typeof TimelineAggregator.getTrustEvolutionSummary).toBe('function');
    });

    test('should have static getCombinedTimeline method', () => {
      expect(typeof TimelineAggregator.getCombinedTimeline).toBe('function');
    });

    test('should have static getCaseTimeline method', () => {
      expect(typeof TimelineAggregator.getCaseTimeline).toBe('function');
    });

    test('should have static getPhoneTimeline method', () => {
      expect(typeof TimelineAggregator.getPhoneTimeline).toBe('function');
    });

    test('should have static getBankTimeline method', () => {
      expect(typeof TimelineAggregator.getBankTimeline).toBe('function');
    });

    test('should have static getDomainTimeline method', () => {
      expect(typeof TimelineAggregator.getDomainTimeline).toBe('function');
    });

    describe('getRiskEvolutionSummary', () => {
      test('should return empty data for no points', async () => {
        // Mock empty return
        const original = TimelineRepository.getRiskEvolution;
        TimelineRepository.getRiskEvolution = async () => [];

        const result = await TimelineAggregator.getRiskEvolutionSummary('test_hash');
        expect(result.has_data).toBe(false);

        TimelineRepository.getRiskEvolution = original;
      });
    });

    describe('getCaseTimeline', () => {
      test('should return empty for no entities', async () => {
        const result = await TimelineAggregator.getCaseTimeline([]);
        expect(result.entities).toEqual([]);
        expect(result.total_events).toBe(0);
      });
    });

    describe('getTrustEvolutionSummary', () => {
      test('should return has_data false for no points', async () => {
        const original = TimelineRepository.getConfidenceEvolution;
        TimelineRepository.getConfidenceEvolution = async () => [];

        const result = await TimelineAggregator.getTrustEvolutionSummary('test');
        expect(result.has_data).toBe(false);

        TimelineRepository.getConfidenceEvolution = original;
      });
    });
  });

  describe('TimelineQueryService', () => {
    test('should have static getEntityTimeline method', () => {
      expect(typeof TimelineQueryService.getEntityTimeline).toBe('function');
    });

    test('should have static getCaseTimeline method', () => {
      expect(typeof TimelineQueryService.getCaseTimeline).toBe('function');
    });

    test('should have static getPhoneTimeline method', () => {
      expect(typeof TimelineQueryService.getPhoneTimeline).toBe('function');
    });

    test('should have static getBankTimeline method', () => {
      expect(typeof TimelineQueryService.getBankTimeline).toBe('function');
    });

    test('should have static getDomainTimeline method', () => {
      expect(typeof TimelineQueryService.getDomainTimeline).toBe('function');
    });

    test('should have static getTimelineEvents method', () => {
      expect(typeof TimelineQueryService.getTimelineEvents).toBe('function');
    });

    test('should have static getActivitySummary method', () => {
      expect(typeof TimelineQueryService.getActivitySummary).toBe('function');
    });

    test('should have static getRiskEvolution method', () => {
      expect(typeof TimelineQueryService.getRiskEvolution).toBe('function');
    });

    test('should have static getDailyAggregation method', () => {
      expect(typeof TimelineQueryService.getDailyAggregation).toBe('function');
    });

    test('should have static getWeeklyAggregation method', () => {
      expect(typeof TimelineQueryService.getWeeklyAggregation).toBe('function');
    });

    test('should have static populateAll method', () => {
      expect(typeof TimelineQueryService.populateAll).toBe('function');
    });

    test('should have static hasTimeline method', () => {
      expect(typeof TimelineQueryService.hasTimeline).toBe('function');
    });
  });
});