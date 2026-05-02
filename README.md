# System Design Master Portfolio

> *"Design is not just what it looks like and feels like. Design is how it works."* — Steve Jobs

A collection of **10 production-grade, distributed system implementations** spanning graph databases, real-time messaging, geospatial engines, and collaborative computing. Each project mirrors the architectural decisions made at scale in real-world engineering organizations — not toy examples, but systems designed to handle real load, real failure modes, and real trade-offs.

---

## Table of Contents

- [Overview](#overview)
- [Project Showcase](#project-showcase)
  - [1. SocialGraph Recommendation & Fraud Engine](#1-socialgraph-recommendation--fraud-engine)
  - [2. Global Distributed Rate Limiter](#2-global-distributed-rate-limiter)
  - [3. Advanced Search & Intelligence Engine](#3-advanced-search--intelligence-engine)
  - [4. Distributed Notification Service](#4-distributed-notification-service)
  - [5. Distributed Ledger & Atomic Transfers](#5-distributed-ledger--atomic-transfers)
  - [6. High-Performance URL Shortener](#6-high-performance-url-shortener)
  - [7. GCS Signed URL & Media Delivery](#7-gcs-signed-url--media-delivery)
  - [8. Ride-Sharing Geospatial Engine](#8-ride-sharing-geospatial-engine)
  - [9. IoT Telemetry & Analytics Platform](#9-iot-telemetry--analytics-platform)
  - [10. Collaborative Document Editor](#10-collaborative-document-editor)
  - [11. Real-Time Traffic Simulation & Monitoring Platform](#11-real-time-traffic-simulation--monitoring-platform)
- [Technology Matrix](#technology-matrix)
- [Repository Structure](#repository-structure)

---

## Overview

This portfolio demonstrates practical mastery of distributed systems design — the kind of knowledge that bridges academic theory with production engineering. Each project targets a specific class of problem (latency, consistency, throughput, fault tolerance) and documents not just the implementation, but the reasoning behind every major architectural decision.

**What makes this different from typical portfolio projects:**

- Every system is designed around a real bottleneck, not an imaginary one
- Trade-offs are explicitly documented in each project's `SYSTEM_DESIGN.md`
- Technologies are chosen for correctness, not familiarity
- Failure modes and recovery strategies are part of the design, not afterthoughts

---

## Project Showcase

---

### 1. SocialGraph Recommendation & Fraud Engine

**Directory:** [`./SocialGraph-Recommendation-Engine`](./SocialGraph-Recommendation-Engine)

**Tech Stack:** Neo4j, Cypher Query Language, Spring Boot, GCP Pub/Sub

#### What It Does

This system solves two distinct problems that share the same underlying data structure: a social graph. Friend recommendations are generated using the Friend-of-a-Friend (FOAF) algorithm — traversing graph relationships to surface second and third-degree connections that are likely to be meaningful. On the fraud side, the same graph is analyzed to detect bot rings: clusters of accounts that follow each other in suspiciously coordinated patterns.

#### Core Architecture

Graph traversal is handled natively by Neo4j, which stores relationships as first-class data structures rather than foreign key joins. This makes multi-hop traversals — the kind required for FOAF — orders of magnitude faster than equivalent queries on a relational database.

Write loads are handled asynchronously. Incoming social events (follows, connections, profile updates) are published to GCP Pub/Sub and ingested into the graph in the background. This decouples write throughput from graph mutation latency, allowing the system to absorb spikes without degrading read performance.

#### Key Design Decisions

- **Why Neo4j over relational?** A `JOIN` on a self-referential users table to find friends-of-friends requires an exponentially growing number of joins per hop. Neo4j's pointer-based traversal is O(log N) regardless of graph depth.
- **Why async ingestion?** Graph mutations (creating nodes, linking edges) involve index updates that are expensive under high concurrency. Buffering writes through Pub/Sub smooths the ingestion curve.
- **Fraud detection via graph theory:** Bot rings exhibit high clustering coefficients and low path lengths between accounts — properties that are invisible to row-based analytics but trivially detectable via graph algorithms like Louvain community detection.

---

### 2. Global Distributed Rate Limiter

**Directory:** [`./Global-Rate-Limiter`](./Global-Rate-Limiter)

**Tech Stack:** Redis, Lua Scripting, Token Bucket Algorithm

#### What It Does

A high-throughput, atomic rate limiting engine that prevents API abuse across a distributed cluster. Every incoming request is checked against a per-client token budget. If the budget is exhausted, the request is rejected. Budgets replenish over time at a configurable rate.

#### Core Architecture

The Token Bucket algorithm is implemented entirely inside Redis using Lua scripts. Because Redis executes Lua atomically — as a single, uninterruptible operation — there are zero race conditions even when dozens of application servers are simultaneously checking and decrementing the same client's token count.

This is a critical distinction. Naive implementations that read a counter, check it, and then decrement it in separate commands are vulnerable to TOCTOU (Time-of-Check-Time-of-Use) races under concurrent load, which can allow requests to slip through the limiter.

#### Key Design Decisions

- **Why Lua scripts in Redis?** Lua scripts are atomic in Redis. They eliminate the need for distributed locks or multi-step transactions, which are expensive and introduce failure modes.
- **Why Token Bucket over Fixed Window?** Fixed window counters reset abruptly and can be gamed — a client can fire a burst of requests at the end of one window and immediately at the start of the next, doubling their effective rate. Token Bucket prevents this by smoothing replenishment over time.
- **Why Redis and not a database?** Rate limiting is a hot path. Every request hits it. It must respond in sub-millisecond time. Redis, as an in-memory store, handles this; a SQL database would not.

---

### 3. Advanced Search & Intelligence Engine

**Directory:** [`./Advanced-Search-Engine`](./Advanced-Search-Engine)

**Tech Stack:** Elasticsearch 8.x, Inverted Indexing, Spring Data Elasticsearch

#### What It Does

A full-text search system capable of querying millions of records with millisecond response times. Beyond basic keyword search, it implements fuzzy matching (typo tolerance), autocomplete suggestions, geo-spatial search (find results near a location), field boosting (prioritizing matches in titles over body text), and faceted aggregations for real-time filtering.

#### Core Architecture

Elasticsearch builds an inverted index at write time: for every document, it maps each token (word) back to the document IDs that contain it. At query time, finding all documents that contain a given word is a direct lookup — not a scan. This is what makes full-text search across millions of records fast.

Fuzzy matching uses Levenshtein distance to match terms that are close to the query, tolerating typos. Autocomplete is implemented using an Edge NGram tokenizer, which pre-indexes every prefix of every term so prefix queries resolve as fast as exact matches.

#### Key Design Decisions

- **Why Elasticsearch over PostgreSQL full-text search?** PostgreSQL's `tsvector` is capable for smaller datasets, but lacks the fuzzy matching, aggregation performance, and horizontal scalability of Elasticsearch.
- **Field boosting:** Matching in a product title should score higher than matching in a description. Boost factors encode this domain knowledge directly into the query.
- **Geo-spatial search:** Elasticsearch natively indexes `geo_point` fields and supports radius queries. Implementing this in SQL requires Haversine formula calculations on every row — a full scan.

---

### 4. Distributed Notification Service

**Directory:** [`./Distributed-Notification-Service`](./Distributed-Notification-Service)

**Tech Stack:** GCP Pub/Sub, Multi-Worker Architecture

#### What It Does

A fan-out notification system capable of handling massive bursts of outbound notifications across multiple channels: SMS, email, and push. When a triggering event occurs (e.g., a payment confirmation or a social interaction), the system fans out to all relevant subscribers without dropping messages, even under extreme load.

#### Core Architecture

Notifications are published to a GCP Pub/Sub topic. Multiple workers subscribe to the topic in parallel, each handling a specific channel (one worker pool for email, one for SMS, one for push). This fan-out pattern means a single event can generate notifications across all channels simultaneously.

Messages that fail delivery are not lost. They are routed to a Dead Letter Queue (DLQ), where they can be inspected, retried, or escalated. This is what makes the system durable — it guarantees at-least-once delivery even when downstream providers (email gateways, SMS carriers) are temporarily unavailable.

#### Key Design Decisions

- **Why Pub/Sub over direct API calls?** Calling notification providers synchronously ties the triggering service's latency to the slowest notification channel. Pub/Sub decouples the producer from consumers entirely.
- **Dead Letter Queue:** Retrying failed messages indefinitely can cause infinite loops if the failure is structural (e.g., an invalid phone number). DLQ separates transient failures (retry) from permanent ones (alert and discard).
- **Multi-worker architecture:** Scaling email throughput independently of SMS throughput requires separate worker pools. A single monolithic consumer cannot be scaled per-channel.

---

### 5. Distributed Ledger & Atomic Transfers

**Directory:** [`./Distributed-Ledger-System`](./Distributed-Ledger-System)

**Tech Stack:** ACID-compliant database, Transactional Integrity, SAGA Pattern

#### What It Does

A financial transfer engine that guarantees money is never lost, duplicated, or left in a partially transferred state. In a multi-step transfer (debit account A, credit account B, record the transaction), any failure in the middle must be fully recoverable — either the entire transfer completes or it does not happen at all.

#### Core Architecture

Single-database transfers use ACID transactions: the debit and credit are wrapped in a transaction that either commits atomically or rolls back entirely. This is the simple case.

The complex case — transfers that span multiple services or databases — uses the SAGA pattern. A SAGA breaks a distributed transaction into a sequence of local transactions, each with a corresponding compensating transaction (an undo operation). If step 3 of a 5-step transfer fails, the system executes compensating transactions for steps 1 and 2, restoring consistency without requiring a distributed lock.

#### Key Design Decisions

- **Why SAGA over 2-Phase Commit (2PC)?** 2PC requires all participating services to hold locks until the coordinator confirms. Under failure, this can leave locks held indefinitely. SAGA trades strict atomicity for availability — a better trade-off for most financial systems.
- **Idempotency keys:** Every transfer operation is keyed by a unique ID. Re-submitting the same transfer (due to network retry) is a no-op, preventing double-spend.
- **Audit log:** Every state transition is appended to an immutable log. This is not just for debugging — it is the source of truth for reconciliation.

---

### 6. High-Performance URL Shortener

**Directory:** [`./url-shortener-system`](./url-shortener-system)

**Tech Stack:** Base62 Encoding, MurmurHash, Redis Caching

#### What It Does

A URL shortening service optimized for read-heavy traffic. Long URLs are converted into short, collision-resistant aliases (e.g., `sho.rt/x7Kp2`). Redirects must resolve in milliseconds at high concurrency.

#### Core Architecture

Short URL aliases are generated using Base62 encoding of a hash of the original URL. MurmurHash is used for its speed and low collision rate — it is not a cryptographic hash, but it does not need to be. The resulting integer is encoded in Base62 (characters `[a-zA-Z0-9]`) to produce a compact, URL-safe alias.

Reads (the vast majority of traffic) are served from Redis. The database is only consulted on a cache miss. Since most popular URLs will be cached after their first access, the effective database load is a small fraction of total traffic.

#### Key Design Decisions

- **Why Base62?** It produces shorter strings than hex (Base16) for the same number of values, and avoids URL-unsafe characters present in Base64 (`+`, `/`, `=`).
- **Why MurmurHash?** SHA-256 is designed for security, not speed. MurmurHash is an order of magnitude faster for this use case, and collision resistance (not pre-image resistance) is the only property required here.
- **Read-through cache:** The cache is populated on first access, not at write time. This avoids cache pollution from URLs that are created but never accessed.

---

### 7. GCS Signed URL & Media Delivery

**Directory:** *(see project root)*

**Tech Stack:** Google Cloud Storage, Signed URLs, Adaptive Bitrate (ABR) Streaming

#### What It Does

A secure media delivery system for private cloud assets. Rather than making GCS buckets public, the backend generates short-lived, cryptographically signed URLs that grant temporary access to specific objects. This enables secure video streaming without exposing the underlying storage.

#### Core Architecture

When a client requests a media asset, the backend generates a GCS Signed URL with a configurable expiry (e.g., 15 minutes). The signed URL embeds the requester's permissions and expiry time in the URL itself, signed with the service account's private key. GCS validates this signature on every request — no session state is required on the backend.

For video, the system supports Adaptive Bitrate (ABR) streaming. The video is stored as multiple renditions at different bitrates. The client player selects the appropriate rendition based on available bandwidth, switching dynamically as network conditions change.

#### Key Design Decisions

- **Why signed URLs over proxying?** Streaming large video files through a backend server is expensive in CPU, memory, and egress costs. Signed URLs let GCS serve the bytes directly to the client, with the backend only involved in access control.
- **Short expiry windows:** Signed URLs with long expiry times are functionally equivalent to public URLs — anyone who obtains the URL can use it. Short expiry (15–30 minutes) limits the blast radius of a leaked URL.

---

### 8. Ride-Sharing Geospatial Engine

**Directory:** [`./Ride-Sharing-Geospatial-System`](./Ride-Sharing-Geospatial-System)

**Tech Stack:** Spring Boot, Redis GEO, WebSockets (STOMP), Leaflet.js

#### What It Does

A real-time spatial matching engine that pairs riders with nearby drivers from a live fleet of 50 simulated vehicles. Driver locations are updated continuously via WebSockets and displayed on a live map. Spatial queries find the nearest available driver in O(log N) time.

#### Core Architecture

Driver GPS coordinates are stored in Redis using the `GEO` data structure, which indexes geospatial coordinates in a sorted set backed by a geohash. Nearest-neighbor queries (`GEORADIUS` or `GEOSEARCH`) run in O(log N) — fast enough to evaluate on every rider request without batching.

WebSockets (using the STOMP subprotocol) push GPS coordinate updates from the server to all connected clients in real time. The map UI is rendered with Leaflet.js, updating car markers as new coordinates arrive over the socket connection.

#### Key Design Decisions

- **Why Redis GEO over PostGIS?** For pure proximity search on a hot dataset (all active drivers), Redis GEO's in-memory index is significantly faster than a disk-based spatial index. PostGIS is more capable for complex spatial queries but introduces disk I/O latency.
- **Why WebSockets over polling?** Polling introduces latency proportional to the poll interval and generates unnecessary load at high client counts. WebSockets allow the server to push updates as they occur, with no redundant requests.
- **O(log N) spatial matching:** Redis GEO's geohash-based index is a z-order space-filling curve. Proximity queries are prefix searches on this curve — logarithmic in the number of indexed points.

---

### 9. IoT Telemetry & Analytics Platform

**Directory:** [`./IoT-GCP-Cassandra-Telemetry`](./IoT-GCP-Cassandra-Telemetry)

**Tech Stack:** GCP Pub/Sub, Dataflow, Apache Cassandra

#### What It Does

A high-throughput ingestion and analytics platform for time-series data from simulated IoT sensors. The system is designed around two competing requirements: massive write throughput (thousands of sensor readings per second) and sub-second analytical queries over recent data.

#### Core Architecture

Sensor readings are published to GCP Pub/Sub and processed by a Dataflow pipeline (Apache Beam), which handles deduplication, windowing, and transformation before writing to Cassandra. Cassandra is the storage layer: a wide-column store optimized for write-heavy workloads, with data partitioned by device ID and clustered by timestamp.

This partition scheme means that querying all readings from a specific device over a time range is a sequential read on a single partition — fast, regardless of total data volume.

#### Key Design Decisions

- **Why Cassandra?** Cassandra's LSM-tree write path (write to memory, flush to disk sequentially) is dramatically faster than B-tree writes on a traditional RDBMS. It also scales horizontally without a single point of failure.
- **Why Dataflow between Pub/Sub and Cassandra?** Raw sensor data is often noisy, duplicated, and out-of-order. Dataflow provides exactly-once processing semantics and handles windowed aggregations before data lands in the analytical store.
- **Partition key design:** Choosing the partition key is the most consequential decision in a Cassandra schema. Partitioning by `device_id` distributes writes evenly across nodes while keeping all readings for a single device co-located for fast range queries.

---

### 10. Collaborative Document Editor

**Directory:** [`./Collaborative-Doc-Editor`](./Collaborative-Doc-Editor)

**Tech Stack:** Spring Boot, WebSockets (STOMP), CRDTs (Yjs), Redis

#### What It Does

A real-time, multi-user document editor with conflict-free collaborative editing. Multiple users can edit the same document simultaneously, with changes merged automatically — no last-write-wins data loss, no manual conflict resolution.

#### Core Architecture

Conflict-free Replicated Data Types (CRDTs), implemented via the Yjs library, are the core primitive. A CRDT is a data structure designed so that concurrent edits from multiple sources can always be merged into a consistent state, regardless of the order in which they are received. This is the mathematical guarantee that makes real-time collaboration work without a central lock.

WebSockets keep all connected clients synchronized: when one user types, the CRDT update is broadcast to all other sessions via the Spring Boot server. Redis persists document state and enables reconnecting clients to catch up on missed updates. Live cursor positions are tracked and broadcast separately from document content.

#### Key Design Decisions

- **Why CRDTs over Operational Transformation (OT)?** OT (used by early Google Docs) requires a central server to serialize and transform every operation. CRDTs are decentralized — they can merge on any node, which simplifies the server architecture and enables offline editing with eventual consistency on reconnect.
- **Why Yjs?** Yjs is a mature, battle-tested CRDT implementation with support for rich text structures and efficient binary encoding. Building a CRDT from scratch is a significant research undertaking.
- **Document snapshots:** Full document state is periodically snapshotted to Redis. On reconnect, a client downloads the latest snapshot and replays only the delta of changes that occurred after it — avoiding full document retransmission.

---

### 11. Real-Time Traffic Simulation & Monitoring Platform

**Directory:** [`./Real-Time-Traffic-Sim-Map`](./Real-Time-Traffic-Sim-Map)

**Tech Stack:** Spring Boot, Redis Pub/Sub, Python, OSRM, Web Speech API, Leaflet.js

#### What It Does

A high-performance geospatial system that simulates real-world urban traffic patterns and live incidents. It provides a real-time reactive dashboard for city-wide congestion monitoring, dynamic routing with traffic-aware ETAs, and narrated turn-by-turn navigation.

#### Core Architecture

The system is built on a reactive event-driven model. A Python-based traffic engine simulates road congestion and publishes updates to Redis. A Spring Boot backend subscribes to these channels and bridges the data to a Leaflet.js frontend via STOMP WebSockets. This ensures that the map reflects city-wide traffic changes (colors, speeds, incidents) with sub-millisecond latency.

#### Key Design Decisions

- **Why Redis Pub/Sub for traffic?** Traffic updates are high-frequency and transient. Pub/Sub provides the lowest possible latency for broadcasting thousands of road state updates per second to all connected dashboards without the overhead of disk persistence.
- **Why OSRM for routing?** The Open Source Routing Machine (OSRM) provides a professional-grade routing engine. We enhanced it with a custom traffic-multiplier logic on the frontend to adjust ETAs dynamically as congestion levels change in real-time.
- **Robust Voice Guidance:** To overcome browser-specific limitations in the Web Speech API (like silent engine pauses or garbage collection of long narrations), we implemented a watchdog timer and global state management for the `SpeechSynthesis` engine.

---

## Technology Matrix

| System | Database | Messaging | Protocol | Key Algorithm |
|---|---|---|---|---|
| SocialGraph Engine | Neo4j | GCP Pub/Sub | REST | FOAF, Community Detection |
| Rate Limiter | Redis | — | REST | Token Bucket |
| Search Engine | Elasticsearch | — | REST | Inverted Index, BM25 |
| Notification Service | — | GCP Pub/Sub | Async | Fan-out |
| Distributed Ledger | RDBMS (ACID) | — | REST | SAGA Pattern |
| URL Shortener | RDBMS + Redis | — | HTTP Redirect | MurmurHash + Base62 |
| Media Delivery | GCS | — | HTTPS | HMAC Signed URL |
| Geospatial Engine | Redis GEO | — | WebSocket (STOMP) | Geohash |
| IoT Platform | Cassandra | GCP Pub/Sub + Dataflow | MQTT / HTTP | LSM-Tree |
| Doc Editor | Redis | — | WebSocket (STOMP) | CRDT (Yjs) |
| Traffic Sim | Redis Pub/Sub | — | WebSocket (STOMP) | Dijkstra / Rush-Hour Weighting |

---

## Repository Structure

Each project directory contains:

```
<project-name>/
├── SYSTEM_DESIGN.md        # Architecture deep-dive: trade-offs, bottlenecks, scaling strategies
├── src/                    # Application source code
├── docker-compose.yml      # Local infrastructure setup (where applicable)
└── README.md               # Project-specific quickstart and configuration guide
```

`SYSTEM_DESIGN.md` is the most important artifact in each directory. It documents the reasoning that does not appear in code: why a particular technology was chosen over alternatives, what the expected failure modes are, and how the system would scale from thousands to millions of operations per second.

---

## Project Links

- [SocialGraph Recommendation Engine](./SocialGraph-Recommendation-Engine)
- [Global Rate Limiter](./Global-Rate-Limiter)
- [Advanced Search Engine](./Advanced-Search-Engine)
- [Distributed Notification Service](./Distributed-Notification-Service)
- [Distributed Ledger System](./Distributed-Ledger-System)
- [URL Shortener](./url-shortener-system)
- [Ride-Sharing Geospatial System](./Ride-Sharing-Geospatial-System)
- [IoT Telemetry Platform](./IoT-GCP-Cassandra-Telemetry)
- [Collaborative Document Editor](./Collaborative-Doc-Editor)
- [Real-Time Traffic Sim & Map](./Real-Time-Traffic-Sim-Map)
