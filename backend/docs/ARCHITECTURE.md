# SELIDIKI Architecture

## Overview

SELIDIKI is a **Fraud Intelligence Platform** that transforms from a simple lookup app into a comprehensive fraud analysis system. The architecture follows a layered design with clear separation of concerns.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Intelligence API Layer                 │
│  /intelligence/entity | /graph | /velocity | /confidence │
│  /history | /cluster                                      │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                    Services Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │  Risk    │ │  Trust   │ │ Velocity │ │Moderation │   │
│  │  Engine  │ │  Engine  │ │ Detection│ │ Pipeline  │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                   Data Intelligence Layer                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │  Fraud   │ │ Lookup   │ │ Evidence │ │  Dataset  │   │
│  │ Collector│ │Collector │ │Collector │ │  Manager  │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                    Graph Engine                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │  Graph   │ │Relation │ │ Cluster  │ │  Query    │   │
│  │  Builder │ │Resolver │ │ Service  │ │  Service  │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                Repository Layer (PostgreSQL)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │  Phone   │ │   Bank   │ │  Report  │ │  History  │   │
│  │    Repo  │ │   Repo   │ │   Repo   │ │    Repo   │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Core Layers

### 1. Data Intelligence Layer (`data/`)
Append-only event sourcing for all platform activities:
- `FraudDataCollector` - Immutable fraud report events
- `LookupEventCollector` - Immutable lookup events with full context
- `EvidenceCollector` - Evidence item storage and verification
- `DatasetVersionManager` - Versioned dataset snapshots for ML training
- `TrainingDatasetExporter` - Feature extraction and dataset export

### 2. Graph Engine (`graph/`)
Fraud relationship mapping and analysis:
- 6 node types: Phone, BankAccount, Domain, Device, Reporter, Case
- 6 relationship types: PHONE_BANK, PHONE_DOMAIN, PHONE_REPORTER, PHONE_DEVICE, BANK_CASE, DOMAIN_CASE
- BFS traversal for connected entity discovery
- Shortest path analysis
- Cluster risk calculation

### 3. Trust Engine (`trust/`)
Explainable trust scoring:
- Community confidence (volume, diversity, recency)
- Reporter reputation (accuracy, evidence rate, history)
- Evidence scoring with time decay
- Combined trust score with breakdown

### 4. Velocity Detection (`velocity/`)
Real-time fraud velocity analysis:
- Burst detection with configurable thresholds
- Trend analysis (hourly, daily, weekly)
- Province distribution monitoring
- Alert threshold evaluation

### 5. Moderation Pipeline (`moderation/`)
Evidence review workflow:
- State machine: pending → verified/rejected/needs_more_evidence → appealed → verified/rejected
- Moderation queue with priority ordering
- Appeal system
- Evidence review with audit trail

## Database Schema

### Core Tables
- `fraud_events` - Append-only event store
- `lookup_events` - Immutable lookup records
- `evidence_items` - Evidence storage with verification status
- `dataset_versions` - Versioned ML training datasets
- `graph_nodes` - Graph nodes (phone, bank, domain, device, reporter, case)
- `graph_edges` - Graph relationships with properties
- `moderation_queue` - Moderation workflow items
- `appeals` - Appeal records
- `evidence_reviews` - Evidence review audit trail

## API Endpoints

### Intelligence Layer (`/api/v1/intelligence`)
- `GET /entity/:hash` - Full intelligence profile
- `GET /confidence/:hash` - Trust score breakdown
- `GET /velocity/:hash` - Velocity detection data
- `GET /graph/:entity` - Graph relationships
- `GET /history/:entity` - Event history
- `GET /cluster/:entity` - Cluster analysis