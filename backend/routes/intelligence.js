// routes/intelligence.js
// Intelligence API routes exposing fraud analytics, graph, velocity, trust, and history.

const express = require('express');
const router = express.Router();
const GraphQueryService = require('../graph/GraphQueryService');
const VelocityService = require('../velocity/VelocityService');
const TrustScoreCalculator = require('../trust/TrustScoreCalculator');
const CommunityConfidenceService = require('../trust/CommunityConfidenceService');
const LookupEventCollector = require('../data/LookupEventCollector');
const FraudDataCollector = require('../data/FraudDataCollector');
const EntityClusterService = require('../graph/EntityClusterService');

const velocityService = new VelocityService();

/**
 * GET /api/v1/intelligence/entity/:hash
 * Full intelligence profile for an entity.
 */
router.get('/entity/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const [graph, trust, velocity, history] = await Promise.all([
      GraphQueryService.getEntityGraphSummary(hash),
      TrustScoreCalculator.calculateTrust(hash),
      velocityService.calculateVelocity(hash),
      LookupEventCollector.getLookupsByHash(hash, 10),
    ]);

    res.apiSuccess({
      entity_hash: hash,
      graph,
      trust,
      velocity,
      history,
      timestamp: new Date().toISOString(),
    }, 'Intelligence data retrieved successfully');
  } catch (err) {
    console.error('Intelligence entity error:', err);
    res.apiError(err.message, 'Failed to retrieve intelligence data', 500);
  }
});

/**
 * GET /api/v1/intelligence/confidence/:hash
 * Community confidence score for an entity.
 */
router.get('/confidence/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const trust = await TrustScoreCalculator.calculateTrust(hash);
    res.apiSuccess(trust, 'Trust score calculated');
  } catch (err) {
    console.error('Confidence error:', err);
    res.apiError(err.message, 'Failed to calculate confidence', 500);
  }
});

/**
 * GET /api/v1/intelligence/velocity/:hash
 * Velocity detection data for an entity.
 */
router.get('/velocity/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const velocity = await velocityService.calculateVelocity(hash);
    res.apiSuccess(velocity, 'Velocity data retrieved');
  } catch (err) {
    console.error('Velocity error:', err);
    res.apiError(err.message, 'Failed to calculate velocity', 500);
  }
});

/**
 * GET /api/v1/intelligence/graph/:entity
 * Graph relationships and cluster for an entity.
 */
router.get('/graph/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const [graphSummary, cluster] = await Promise.all([
      GraphQueryService.getEntityGraphSummary(entity),
      EntityClusterService.findFraudCluster(entity, 2),
    ]);

    res.apiSuccess({
      entity,
      graph: graphSummary,
      cluster: {
        size: cluster.size,
        node_types: cluster.node_types,
        risk_summary: cluster.risk_summary,
        nodes: cluster.nodes,
        edges: cluster.edges,
      },
    }, 'Graph data retrieved');
  } catch (err) {
    console.error('Graph error:', err);
    res.apiError(err.message, 'Failed to retrieve graph data', 500);
  }
});

/**
 * GET /api/v1/intelligence/history/:entity
 * Lookup and event history for an entity.
 */
router.get('/history/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const [lookups, events, stats] = await Promise.all([
      LookupEventCollector.getLookupsByHash(entity, 50),
      FraudDataCollector.getEventsByHash(entity),
      LookupEventCollector.getLookupStats(entity),
    ]);

    res.apiSuccess({
      entity,
      lookups,
      fraud_events: events,
      stats,
      total_lookups: lookups.length,
      total_events: events.length,
    }, 'History retrieved');
  } catch (err) {
    console.error('History error:', err);
    res.apiError(err.message, 'Failed to retrieve history', 500);
  }
});

/**
 * GET /api/v1/intelligence/cluster/:entity
 * Fraud cluster analysis for an entity.
 */
router.get('/cluster/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const maxHops = parseInt(req.query.hops) || 3;

    const cluster = await EntityClusterService.findFraudCluster(entity, maxHops);
    const clusterRisk = EntityClusterService.calculateClusterRisk(cluster.nodes, cluster.edges);

    res.apiSuccess({
      entity,
      cluster,
      risk_assessment: clusterRisk,
    }, 'Cluster analysis retrieved');
  } catch (err) {
    console.error('Cluster error:', err);
    res.apiError(err.message, 'Failed to analyze cluster', 500);
  }
});

module.exports = router;