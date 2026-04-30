# System Design Practical Projects: Master Portfolio

A collection of high-performance, distributed, and scalable system implementations. This repository serves as a practical blueprint for solving complex engineering challenges in real-world production environments.

---

## Project Showcases

### 1. SocialGraph Recommendation & Fraud Engine
*   **Tech:** Neo4j, Cypher, Spring Boot, GCP Pub/Sub.
*   **Core Logic:** Implements Friend-of-a-Friend (FOAF) recommendations and Bot-Ring detection using Graph Theory.
*   **Key Feature:** Asynchronous graph ingestion via cloud events to handle massive write loads.

### 2. Global Distributed Rate Limiter
*   **Tech:** Redis, Lua Scripting, Token Bucket Algorithm.
*   **Core Logic:** Prevents API abuse using a high-throughput, atomic counting engine.
*   **Key Feature:** Uses Lua scripts inside Redis to guarantee zero race conditions across a distributed cluster.

### 3. Advanced Search & Intelligence Engine
*   **Tech:** Elasticsearch 8.x, Inverted Indexing, Spring Data ES.
*   **Core Logic:** Full-text search across millions of records with "Fuzzy Matching" (typo tolerance) and relevance scoring.
*   **Intelligence:** Implements **Autocomplete**, **Geo-Spatial Search**, and **Field Boosting** to prioritize results.
*   **Key Feature:** High-performance faceted search (aggregations) for real-time filtering.

### 4. Distributed Notification Service
*   **Tech:** GCP Pub/Sub, Multi-Worker Architecture.
*   **Core Logic:** A fan-out system that handles massive notification bursts (SMS, Email, Push) without dropping messages.
*   **Key Feature:** Durable message processing with dead-letter-queue (DLQ) support.

### 5. Distributed Ledger & Atomic Transfers
*   **Tech:** ACID Compliance, Transactional Integrity.
*   **Core Logic:** Ensures that in a multi-step financial transfer, money is never "lost" or "double-spent."
*   **Key Feature:** Implementation of the SAGA pattern logic for distributed consistency.

### 6. High-Performance URL Shortener
*   **Tech:** Base62 Encoding, MurmurHash, Redis Caching.
*   **Core Logic:** Converts long URLs into tiny, collision-resistant aliases.
*   **Key Feature:** Optimized for read-heavy traffic with millisecond response times.

### 7. GCS Signed URL & Media Delivery
*   **Tech:** Google Cloud Storage, Signed URLs, ABR Streaming.
*   **Core Logic:** Secure, time-limited access to private cloud assets.
*   **Key Feature:** Support for Adaptive Bitrate (ABR) video streaming previews.

### 8. Ride-Sharing Geospatial Engine
*   **Tech:** Spring Boot, Redis GEO, WebSockets (STOMP), Leaflet.js.
*   **Core Logic:** High-performance spatial matching ($O(\log N)$) between riders and a live fleet of 50 simulated drivers.
*   **Key Feature:** Real-time car tracking using WebSockets to push GPS coordinate updates directly to a glassmorphism map UI.

### 9. IoT Telemetry & Analytics Platform
*   **Tech:** GCP Pub/Sub, Dataflow, Apache Cassandra.
*   **Core Logic:** High-throughput ingestion of time-series data from simulated IoT sensors.
*   **Key Feature:** Horizontally scalable architecture designed to handle massive write-loads and provide sub-second analytical querying.

### 10. Collaborative Document Editor
*   **Tech:** Spring Boot, WebSockets (STOMP), CRDTs (Yjs), Redis.
*   **Core Logic:** Real-time, conflict-free editing using Conflict-free Replicated Data Types (CRDTs) to ensure eventual consistency.
*   **Key Feature:** High-concurrency synchronization with support for live cursor tracking and document snapshots.

---

## Project Navigation
Each project contains its own SYSTEM_DESIGN.md explaining the deep technical trade-offs, bottlenecks, and scaling strategies.

- [SocialGraph Engine](./SocialGraph-Recommendation-Engine)
- [Global Rate Limiter](./Global-Rate-Limiter)
- [Advanced Search Engine](./Advanced-Search-Engine)
- [Distributed Ledger](./Distributed-Ledger-System)
- [Notification Service](./Distributed-Notification-Service)
- [URL Shortener](./url-shortener-system)
- [Ride-Sharing Geospatial System](./Ride-Sharing-Geospatial-System)
- [IoT Telemetry Platform](./IoT-GCP-Cassandra-Telemetry)
- [Collaborative Document Editor](./Collaborative-Doc-Editor)

---
> **"Design is not just what it looks like and feels like. Design is how it works."**
