# Data Intelligence Pipeline

## Overview

The Data Pipeline forms the foundation of the SELIDIKI fraud intelligence platform. It implements an **append-only event sourcing** pattern where all actions (lookups, reports, verifications) produce immutable events that can never be overwritten.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Lookup     │     │   Fraud      │     │   Evidence   │
│   Events     │     │   Reports    │     │   Uploads    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────┐
│               Append-Only Event Store                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │lookup_events │  │ fraud_events │  │evidence_   │ │
│  │              │  │              │  │  items     │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────────────────────────────────────────────┐
│            Dataset Version Manager                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │
│  │ Versioned  │  │ Published  │  │ Training       │ │
│  │ Snapshots  │  │ Datasets   │  │ Exporter       │ │
│  └────────────┘  └────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Components

### 1. FraudDataCollector
Records immutable fraud report events.
- **Event types**: `report`, `verification`, `false_report`
- **Storage**: `fraud_events` table
- **Key fields**: id, event_type, report_id, entity_type, hash, risk_score, confidence, category, reporter_hash, timestamp
- **Query patterns**: by hash, by event type, with time range

### 2. LookupEventCollector
Records every lookup as an immutable event.
- **Storage**: `lookup_events` table
- **Key fields**: lookup_id, entity_type, hash, risk_score, confidence, matched_profiles (JSONB), response_time_ms, provider, app_version, timestamp
- **Features**: Aggregate stats per entity (total lookups, avg response time, provider diversity)

### 3. EvidenceCollector
Manages evidence items with verification workflow integration.
- **Storage**: `evidence_items` table
- **Types**: image, pdf, screenshot, link
- **Status workflow**: pending → verified/rejected/needs_review
- **Metadata**: JSONB for flexible additional data (OCR text, file hashes)

### 4. DatasetVersionManager
Creates versioned snapshots of verified fraud data for ML training.
- **Status flow**: building → published
- **Features**: Version tracking, metrics storage, dataset export
- **Use case**: Training data versioning for model reproducibility

### 5. TrainingDatasetExporter
Exports clean training datasets with extracted features.
- **Feature extraction**: evidence_count, lookup_count, reporter presence, entity type one-hot, confidence score
- **Label options**: risk_score (regression), category (classification), confidence
- **Export formats**: Training records with { features, label, meta }, flat records

## Append-Only Guarantees

- **No UPDATE** operations on event records
- **No DELETE** operations on historical data
- Each event has a unique UUID and immutable timestamp
- History is always complete and auditable
- Perfect for audit trails and ML training data provenance

## Indexes

All event tables have indexes on:
- `hash` - Fast entity lookup
- `timestamp` - Time-range queries
- `event_type` - Type-based filtering
- Composite indexes where needed for common query patterns

## Usage Examples

### Recording a fraud report
```javascript
const event = await FraudDataCollector.collectReportEvent({
  reportId: 'SLD-12345',
  entityType: 'phone',
  normalizedEntity: '6281234567890',
  hash: 'abc123hash',
  riskScore: 85,
  confidence: 72,
  category: 'marketplace_scam',
  reporterHash: 'reporter_hash_xyz',
});
```

### Recording a lookup
```javascript
const lookup = await LookupEventCollector.recordLookup({
  lookupId: 'L-67890',
  entityType: 'phone',
  hash: 'abc123hash',
  riskScore: 85,
  confidence: 72,
  matchedProfiles: [{ id: 1, risk: 85 }],
  responseTime: 145,
  provider: 'internal',
  appVersion: '1.2.0',
});