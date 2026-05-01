# Distributed Feature Flag & Experimentation Platform

A production-grade system for managing feature flags, A/B testing, and gradual rollouts. Built with Spring Boot, gRPC, and GCP.

## 🚀 Key Features
- **Control Plane**: RESTful API for flag management and rule configuration.
- **Data Plane**: Ultra-low latency gRPC evaluation service.
- **Real-time Updates**: Instant propagation of changes via GCP Pub/Sub and gRPC Streaming.
- **Intelligent Evaluation**:
  - Rule-based targeting (Country, Device, User Attributes).
  - Deterministic Murmur3-based hashing for percentage rollouts.
  - Variant allocation for A/B testing.
- **Reliability**: Kill switch support, Redis caching, and Webhook delivery with exponential backoff.

## 🏗️ Architecture
See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for a detailed architectural breakdown.

## 🛠️ Setup & Running

### Prerequisites
- Docker & Docker Compose
- Java 17
- Maven

### Run using Docker Compose
```bash
docker-compose up --build
```
This will start:
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Pub/Sub Emulator (Port 8085)
- Control Plane (Port 8080)
- Data Plane (gRPC Port 9090)
- Webhook Service

## 📡 API Usage

### 1. Create a Feature Flag (Control Plane)
**POST** `http://localhost:8080/api/v1/flags`
```json
{
  "key": "new-checkout-flow",
  "description": "Enables the redesigned checkout experience",
  "enabled": true,
  "rolloutPercentage": 50,
  "rules": [
    {
      "attributeName": "country",
      "operator": "EQUALS",
      "attributeValue": "US"
    }
  ],
  "variants": [
    { "key": "control", "weight": 50 },
    { "key": "red_button", "weight": 50 }
  ]
}
```

### 2. Evaluate a Flag (Data Plane - gRPC)
Using `grpcurl`:
```bash
grpcurl -plaintext -d '{
  "flag_key": "new-checkout-flow",
  "user_id": "user_123",
  "context": {"country": "US"}
}' localhost:9090 com.ffplatform.grpc.EvaluationService/GetEvaluation
```

**Response:**
```json
{
  "flag_key": "new-checkout-flow",
  "enabled": true,
  "variant": "red_button"
}
```

## 📈 Load Testing Strategy
To simulate production-grade traffic (millions of requests/sec):
1. **Vertical Scaling**: Scale Data Plane pods to handle ~50k RPS per instance.
2. **Horizontal Scaling**: Use Cloud Run with auto-scaling based on CPU/Request count.
3. **Caching**: Ensure Redis hit rate is >99%.
4. **Tooling**: Use `k6` with the `k6-grpc` plugin.
   - Script: Iterate through random `userIds` and evaluate multiple flags.
   - Monitor: Latency (P99 < 10ms) and Redis CPU utilization.

## 🛡️ Advanced Features
- **Idempotency**: All flag creation/update requests are idempotent based on the `key`.
- **Observability**: Standardized logging with Trace IDs propagated from gRPC to Pub/Sub to Webhooks.
- **Local SDK Caching**: (Planned) SDKs fetch flag definitions periodically and use local Murmur3 evaluation for zero-latency checks.
