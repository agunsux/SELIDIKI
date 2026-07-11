# Fraud Graph Engine

## Overview

The Fraud Graph Engine maps relationships between entities involved in fraud. It connects phone numbers, bank accounts, domains, devices, reporters, and cases into a graph structure that enables cluster detection, relationship discovery, and risk propagation analysis.

## Node Types

| Node Type | ID Format | Properties |
|-----------|-----------|------------|
| phone | `{hash}` | hash, entity_type, risk_score, category |
| bank_account | `bank:{hash}` | hash, bank_code, ... |
| domain | `domain:{domain}` | domain, ... |
| device | `device:{deviceId}` | device_id, ... |
| reporter | `reporter:{hash}` | hash, province, ... |
| case | `case:{reportId}` | report_id, category, risk_score |

## Relationship Types

| Relationship | Source → Target | Description |
|-------------|----------------|-------------|
| PHONE_BANK | phone → bank_account | Phone linked to a bank account |
| PHONE_DOMAIN | phone → domain | Phone associated with a domain |
| PHONE_REPORTER | phone → reporter | Phone was reported by this reporter |
| PHONE_DEVICE | phone → device | Phone used on this device |
| BANK_CASE | bank_account → case | Bank account involved in a fraud case |
| DOMAIN_CASE | domain → case | Domain involved in a fraud case |

## Graph Components

### 1. GraphBuilder
Core CRUD operations for graph nodes and edges.
- `addNode()` - Idempotent node creation/update
- `addEdge()` - Idempotent edge creation with properties
- `getNode()` - Single node retrieval
- `getNodeEdges()` - All edges (incoming + outgoing) for a node
- `deleteNode()` - Cascading delete

### 2. GraphRepository
Data access layer with batch operations.
- `findNodesByType()` - Filtered node queries
- `findEdgesByRelationship()` - Relationship-based edge queries
- `getConnectedNodes()` - Nodes connected by relationship type
- `batchInsertNodes()` / `batchInsertEdges()` - Bulk operations

### 3. RelationshipResolver
Business logic for creating typed relationships from source data.
- `resolveFromEvent()` - Auto-create phone, reporter, and case nodes from fraud events
- `linkPhoneToBank()` - Create PHONE_BANK edge
- `linkPhoneToDomain()` - Create PHONE_DOMAIN edge
- `linkPhoneToDevice()` - Create PHONE_DEVICE edge
- `linkBankToCase()` / `linkDomainToCase()` - Case association
- `getPhoneRelationships()` - Get all relationships for a phone entity

### 4. EntityClusterService
Graph traversal and analysis.
- `findConnectedEntities()` - BFS traversal within N hops
- `findShortestPath()` - BFS shortest path between two nodes
- `findFraudCluster()` - Complete cluster analysis with risk summary
- `calculateClusterRisk()` - Risk score based on node risks + graph density

### 5. GraphQueryService
High-level query interface.
- `getEntityGraphSummary()` - Full graph profile for an entity
- `getGraphSummary()` - Lightweight graph metadata
- `searchNodes()` - Property-based search
- `getGraphStatistics()` - Global graph stats

## Cluster Risk Calculation

The cluster risk is a weighted combination:
```
clusterRisk = avgNodeRisk * 0.5 + maxNodeRisk * 0.3 + density * 20
```

Where:
- `avgNodeRisk` - Mean risk score across all nodes in cluster
- `maxNodeRisk` - Highest risk score
- `density` - Actual edges / max possible edges ratio

## Database Schema

```sql
-- Nodes table
CREATE TABLE graph_nodes (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Edges table with referential integrity
CREATE TABLE graph_edges (
    source_id VARCHAR(255) NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_id VARCHAR(255) NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    relationship VARCHAR(64) NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_id, target_id, relationship)
);
```

## Query Performance

- Indexes on node type, edge source/target, and relationship type
- BFS traversal avoids cycles via visited set tracking
- Edge-level properties stored in JSONB for flexibility
- Batch operations for bulk graph construction