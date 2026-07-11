# Intelligence API Layer

## Overview

The Intelligence API Layer exposes all fraud analytics capabilities through RESTful endpoints. It provides unified access to risk assessment, trust scoring, velocity detection, graph relationships, and historical data for any entity in the SELIDIKI system.

## Endpoints

### 1. Full Intelligence Profile
```
GET /api/v1/intelligence/entity/:hash
```

Returns a comprehensive intelligence profile combining:
- **Graph summary** - Connected entities and relationships
- **Trust score** - Community confidence, reporter reputation, evidence quality
- **Velocity data** - Report frequency, burst detection, trend analysis
- **History** - Recent lookup and fraud events

**Response:**
```json
{
  "success": true,
  "data": {
    "entity_hash": "abc123...",
    "graph": { "exists": true, "relationships": {}, "cluster": {} },
    "trust": { "trust_score": 85, "confidence": 72, "trust_level": "high" },
    "velocity": { "velocity_score": 45, "trend": "rising", "severity": "medium" },
    "history": [...],
    "timestamp": "2026-07-11T..."
  }
}
```

### 2. Trust Score
```
GET /api/v1/intelligence/confidence/:hash
```

Returns explainable trust score with full breakdown.

### 3. Velocity Detection
```
GET /api/v1/intelligence/velocity/:hash
```

Returns real-time velocity metrics including burst detection and trend analysis.

### 4. Graph Relationships
```
GET /api/v1/intelligence/graph/:entity
```

Returns graph structure showing connected entities and cluster summary.

### 5. Entity History
```
GET /api/v1/intelligence/history/:entity
```

Returns lookup history and fraud events for an entity with aggregate stats.

### 6. Cluster Analysis
```
GET /api/v1/intelligence/cluster/:entity
```
Query params: `?hops=3` (max traversal depth)

Returns complete cluster with all nodes, edges, and risk assessment.

## Response Format

All endpoints follow the standard SELIDIKI response envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Description",
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

## Error Handling

Errors return:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Error detail"],
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

## Rate Limiting

Intelligence endpoints are subject to the global API rate limit (100 requests per 15 minutes).