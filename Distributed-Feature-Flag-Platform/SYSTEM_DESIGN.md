# System Design: Distributed Feature Flag & Experimentation Platform

## 1. Overview
A production-grade, highly scalable system for managing feature flags, gradual rollouts, and A/B testing. Designed with a clear separation between the **Control Plane** (Management) and **Data Plane** (Evaluation).

## 2. Architecture Diagram (Text-based)
```
[ Client SDK (Java/Node/Go) ]
      |
      | (gRPC / Streaming)
      v
[ Data Plane (Cloud Run) ] <---- (Subscribes) ---- [ Pub/Sub ]
      |                                              ^
      | (Read-aside)                                 | (Publish)
      v                                              |
[ Memorystore (Redis) ]                        [ Control Plane (Cloud Run) ]
      |                                              |
      | (Fallback/Sync)                              | (CRUD)
      v                                              v
[ Cloud SQL (PostgreSQL) ] <----------------- [ Admin Dashboard / API ]
      |
      | (Audit Logs)
      v
[ Cloud Logging ]
      |
      | (Events)
      v
[ Webhook Service (Cloud Run) ] ----> [ External Systems ]
```

## 3. Component Details

### A. Control Plane (Admin Service)
- **Responsibility**: CRUD operations for flags, segments, and experiments.
- **Persistence**: Cloud SQL (PostgreSQL) stores the source of truth.
- **Broadcasting**: When a flag is updated, it publishes a message to **GCP Pub/Sub**.
- **Audit Logging**: Every change is recorded in an `audit_logs` table for compliance.

### B. Data Plane (Evaluation Service)
- **Responsibility**: High-performance flag evaluation.
- **Protocol**: gRPC for low-latency communication.
- **Caching**: Memorystore (Redis) caches flag configurations.
- **Real-time Updates**: Subscribes to Pub/Sub to invalidate cache or push updates to clients via gRPC streaming.
- **Evaluation Logic**:
  - **Rule Engine**: Evaluates JSON-based targeting rules (e.g., `user.country == 'US'`).
  - **Deterministic Hashing**: Uses `murmur3(userId + flagKey) % 100` for percentage rollouts and A/B testing.

### C. Webhook Service
- **Responsibility**: Notify external systems of flag changes.
- **Reliability**: Uses a Task Queue pattern with retries and exponential backoff.
- **DLQ**: Failed webhook deliveries are moved to a Dead Letter Queue for manual intervention.

## 4. GCP Integration Rationale
| Service | Role | Why? | Alternatives |
| :--- | :--- | :--- | :--- |
| **Cloud Run** | Compute | Serverless, scales to zero, easy deployment. | GKE (more complex) |
| **Cloud SQL (Postgres)** | Database | Reliable, relational ACID properties for config. | Firestore (less rigid schema) |
| **Memorystore (Redis)** | Cache | Sub-millisecond latency for evaluations. | Local Cache (consistency issues) |
| **Pub/Sub** | Messaging | Asynchronous communication between planes. | Kafka (expensive for mid-size) |
| **Secret Manager** | Security | Secure storage for API keys and DB credentials. | Environment Variables |

## 5. Evaluation Lifecycle
1. **Client** sends `GetFlagEvaluation(userId, flagKey, context)` via gRPC.
2. **Data Plane** checks **Redis** for flag configuration.
3. If **Cache Miss**: Fetch from **Cloud SQL** and populate Redis.
4. **Evaluator** checks targeting rules (Country, Device, etc.).
5. If rules pass, calculate **Rollout**: `hash(userId + flagKey) % 100 < percentage`.
6. Return `Variant` or `Enabled/Disabled` status.

## 6. Advanced Features
- **Local SDK Caching**: SDKs should fetch all flags on startup and subscribe to gRPC streams for updates.
- **Kill Switch**: A global flag that overrides all evaluation logic to return a default "safe" value.
- **Multi-region**: Deploy Data Plane in multiple regions with Redis replication for global low latency.

## 7. Failure Handling
- **Redis Down**: Fallback to Cloud SQL.
- **Cloud SQL Down**: Return default values specified in the SDK.
- **Pub/Sub Lag**: Eventual consistency is expected (usually < 1s).
