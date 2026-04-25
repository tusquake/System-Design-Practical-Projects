# 🚀 ScaleVault — Scalable Cloud Backend on Google Cloud Platform

> A production-grade, event-driven backend system built on GCP — designed for high throughput, real-time notifications, analytics, and zero-downtime scalability.

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture Overview](#-architecture-overview)
- [End-to-End Request Flow](#-end-to-end-request-flow)
- [Service-by-Service Breakdown](#-service-by-service-breakdown)
- [Scalability & System Design](#-scalability--system-design)
- [Data & Analytics Pipeline](#-data--analytics-pipeline)
- [Security Design](#-security-design)
- [Observability: Logging & Monitoring](#-observability-logging--monitoring)
- [Failure Handling & Reliability](#-failure-handling--reliability)
- [Deployment & CI/CD](#-deployment--cicd)
- [Future Improvements](#-future-improvements)
- [Tech Stack Summary](#-tech-stack-summary)

---

## 📌 Project Overview

### The Business Problem

Imagine building an application like Google Drive meets Slack — users upload files, those files are processed in the background, push notifications go out to relevant users, analytics are tracked, and the whole thing needs to stay fast and reliable even if a million users hit it at once.

Most traditional backends collapse under this kind of pressure. They can't separate "fast tasks" from "slow tasks," they get overloaded during traffic spikes, and a single failure cascades into full system downtime.

### The Solution: ScaleVault

**ScaleVault** is a scalable, event-driven backend built on Google Cloud Platform (GCP). It handles:

- ✅ **Secure user authentication** via OAuth 2.0
- ✅ **File uploads and processing** at scale via Cloud Storage + Cloud Functions
- ✅ **Real-time push notifications** via Firebase
- ✅ **Async background jobs** that don't block user-facing APIs
- ✅ **Analytics and reporting** powered by BigQuery
- ✅ **Zero-downtime scaling** via Cloud Run and GKE

Think of this system like a modern post office — users drop off packages (requests), the desk clerk (API) immediately acknowledges receipt, sorters (background workers) handle the actual processing, and couriers (notifications) keep everyone updated — all independently, all reliably.

---

## 🏗️ Architecture Overview

```
                        ┌────────────────────────────────────────────────────────┐
                        │                     CLIENT LAYER                        │
                        │         (Web App / Mobile App / Third-party API)        │
                        └────────────────────┬───────────────────────────────────┘
                                             │ HTTPS Request
                                             ▼
                        ┌────────────────────────────────────────────────────────┐
                        │               CLOUD LOAD BALANCER                       │
                        │    Distributes traffic across Cloud Run instances        │
                        └────────────────────┬───────────────────────────────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         ▼                   ▼                   ▼
                  ┌─────────────┐   ┌─────────────────┐  ┌─────────────┐
                  │  Cloud CDN  │   │   Cloud Run API  │  │  Cloud IAM  │
                  │ (Static &   │   │  (Main Backend   │  │  (Access    │
                  │  Cached     │   │   Services)      │  │   Control)  │
                  │  Assets)    │   └────────┬────────┘  └─────────────┘
                  └─────────────┘            │
                                             │
              ┌──────────────────────────────┼────────────────────────────────┐
              │                              │                                │
              ▼                              ▼                                ▼
   ┌─────────────────────┐     ┌─────────────────────────┐      ┌────────────────────┐
   │     Cloud SQL        │     │      Cloud Firestore      │      │   Cloud Storage    │
   │  (Relational Data:   │     │  (Real-time / NoSQL       │      │  (File Uploads,    │
   │   Users, Orders)     │     │   User Sessions, Feeds)   │      │   Media Assets)    │
   └─────────────────────┘     └─────────────────────────┘      └────────────────────┘
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │    Cloud Pub/Sub           │
                              │  (Event Bus — Decouples    │
                              │   services asynchronously) │
                              └──────────┬───────────────┘
                                         │
              ┌──────────────────────────┼───────────────────────────┐
              │                          │                           │
              ▼                          ▼                           ▼
   ┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
   │  Cloud Functions │     │     Cloud Tasks       │     │   GKE Workers       │
   │ (Lightweight     │     │  (Scheduled / Retry   │     │  (Heavy Processing  │
   │  Event Handlers) │     │   Background Jobs)    │     │   Workloads)        │
   └─────────────────┘     └──────────────────────┘     └─────────────────────┘
              │                          │                           │
              └──────────────────────────┼───────────────────────────┘
                                         │
                         ┌───────────────┼────────────────────┐
                         ▼                                     ▼
              ┌─────────────────────┐              ┌────────────────────────┐
              │  Firebase Push       │              │      BigQuery           │
              │  Notifications       │              │  (Analytics, Reporting) │
              └─────────────────────┘              └────────────────────────┘

                    ┌────────────────────────────────────────────────┐
                    │              OBSERVABILITY LAYER                │
                    │    Cloud Logging + Cloud Monitoring             │
                    └────────────────────────────────────────────────┘

                    ┌────────────────────────────────────────────────┐
                    │              SECURITY LAYER                     │
                    │    Cloud Secret Manager + VPC + Cloud IAM       │
                    └────────────────────────────────────────────────┘
```

---

## 🔄 End-to-End Request Flow

This section walks through the complete journey of a request — from a user clicking "Upload File" to receiving a push notification that their file is ready.

---

### Step 1 — User Authenticates (OAuth 2.0)

The user logs in via Google OAuth. Behind the scenes, GCP Identity Platform validates their identity and issues a secure **JWT token** (think of it as a digital ID card the user carries with every request).

```
User → OAuth Login → JWT Token issued → Stored in client
```

---

### Step 2 — Request Hits the Load Balancer

Every API request first arrives at **Cloud Load Balancer**. Like a traffic cop at a busy intersection, it routes the request to the healthiest available Cloud Run instance — preventing any one server from getting overwhelmed.

```
Client → HTTPS → Cloud Load Balancer → Cloud Run Instance
```

---

### Step 3 — API Processes the Request (Cloud Run)

The **Cloud Run** API service:
1. Validates the JWT token (is this user who they claim to be?)
2. Checks permissions via **Cloud IAM** (are they allowed to do this?)
3. Retrieves or writes structured data to **Cloud SQL** (user profiles, orders)
4. Updates real-time state in **Cloud Firestore** (live feed, activity status)
5. Saves the uploaded file to **Cloud Storage**
6. Returns an immediate `202 Accepted` to the user — the heavy lifting happens in the background

```
Cloud Run → Validate Token → IAM Check → SQL + Firestore → Storage → Respond
```

---

### Step 4 — Event Published to Pub/Sub

After saving, Cloud Run publishes an event to **Cloud Pub/Sub**:

```json
{
  "event": "file.uploaded",
  "userId": "u_12345",
  "fileId": "f_abc123",
  "bucket": "scalevault-uploads",
  "timestamp": "2025-04-25T10:30:00Z"
}
```

Think of Pub/Sub like a notice board in an office — anyone who cares about this event can subscribe and react, without the original poster needing to know who's listening.

---

### Step 5 — Background Workers React (Cloud Functions + GKE)

Multiple consumers react to the Pub/Sub event independently:

- **Cloud Function A** — Scans the file for viruses and validates format
- **Cloud Function B** — Generates a thumbnail/preview and writes metadata back to Firestore
- **GKE Worker** — Runs a heavy ML-based processing job (e.g., transcription, OCR) if the file requires it
- **Cloud Tasks** — Schedules a follow-up job (e.g., "send a summary email in 10 minutes")

```
Pub/Sub Event → [Cloud Functions | GKE Workers | Cloud Tasks] → parallel processing
```

---

### Step 6 — User Gets Notified (Firebase Push Notifications)

Once processing completes, a Cloud Function publishes the result and triggers a **Firebase Push Notification**:

```
"Your file 'report.pdf' has been processed and is ready to view."
```

This arrives on the user's phone or browser in real time — no polling needed.

---

### Step 7 — Analytics Logged to BigQuery

Every significant event in the system (file uploaded, job completed, notification sent) is streamed to **BigQuery** via Pub/Sub. This powers dashboards, reporting, and future ML models — without impacting the production database.

```
All Events → Pub/Sub → BigQuery → Dashboards / Reports
```

---

## 🔧 Service-by-Service Breakdown

---

### 🔐 OAuth 2.0 (Authentication)

| | |
|---|---|
| **What it does** | Lets users log in securely using Google accounts without the app ever touching their password |
| **Why chosen** | Industry standard; eliminates the need to build and maintain a custom auth system |
| **Where it fits** | Entry point — every request starts with a valid OAuth token |
| **Trade-offs** | Dependent on Google's identity service; custom auth would offer more control |
| **Analogy** | Like using your company ID badge at the front desk — you don't need a separate key for every door |

---

### ☁️ Cloud Run (Main API Service)

| | |
|---|---|
| **What it does** | Runs containerized API services that automatically scale up or down based on traffic |
| **Why chosen** | Fully managed — no servers to maintain. Scales to zero when idle (cost-efficient) |
| **Where it fits** | The brain of the system — handles all API logic and orchestrates data flow |
| **Trade-offs** | Cold starts can add latency; for always-on services, GKE may be preferred |
| **Analogy** | Like a team of chefs that grows when the restaurant gets busy and shrinks during quiet hours |

---

### ⚡ Cloud Functions (Lightweight Event Handlers)

| | |
|---|---|
| **What it does** | Runs small, single-purpose functions triggered by events (file upload, Pub/Sub message, HTTP call) |
| **Why chosen** | Perfect for isolated tasks — no infrastructure needed, billed per invocation |
| **Where it fits** | Handles lightweight background processing (thumbnail generation, virus scan, notification dispatch) |
| **Trade-offs** | Max 9-minute execution time; not suitable for long-running or stateful jobs |
| **Analogy** | Like a specialist contractor — you call them for one specific job, they do it and leave |

---

### 🔥 Cloud Firestore (Real-time NoSQL Database)

| | |
|---|---|
| **What it does** | A flexible, scalable NoSQL database that syncs data in real time to clients |
| **Why chosen** | Ideal for live feeds, notifications, user sessions — data updates instantly across all connected clients |
| **Where it fits** | Stores activity feeds, real-time status, notifications, and user preferences |
| **Trade-offs** | Not ideal for complex relational queries; doesn't replace SQL for structured data |
| **Analogy** | Like a live whiteboard in a meeting room — everyone in the room sees changes instantly |

---

### 🗃️ Cloud SQL (Relational Database)

| | |
|---|---|
| **What it does** | A fully managed relational database (PostgreSQL or MySQL) for structured, transactional data |
| **Why chosen** | Best for data that has relationships (user → orders → payments) and needs ACID guarantees |
| **Where it fits** | Stores users, orders, subscriptions, billing — anything requiring strict consistency |
| **Trade-offs** | Vertical scaling has limits; for extreme scale, Spanner or sharding would be needed |
| **Analogy** | Like a filing cabinet with labeled folders — everything is organized, indexed, and retrievable by precise rules |

---

### 📋 Cloud Tasks (Background Job Queue)

| | |
|---|---|
| **What it does** | Manages a queue of tasks to be executed asynchronously, with retry logic and scheduling |
| **Why chosen** | Decouples long-running operations from the user-facing API; ensures reliable execution |
| **Where it fits** | Handles jobs like "send email summary in 10 minutes" or "retry failed payment after 1 hour" |
| **Trade-offs** | Adds operational complexity; simpler use cases might not need it |
| **Analogy** | Like a numbered queue at a bank — you take your number, go sit down, and get called when it's your turn |

---

### 📢 Cloud Pub/Sub (Event-Driven Architecture)

| | |
|---|---|
| **What it does** | A messaging system where services publish events and other services subscribe to them |
| **Why chosen** | Decouples services — publishers don't need to know who's listening; enables parallel processing |
| **Where it fits** | Central event bus connecting API → Cloud Functions → GKE → BigQuery |
| **Trade-offs** | At-least-once delivery means consumers must handle duplicate messages (idempotency required) |
| **Analogy** | Like a radio broadcast — the DJ (publisher) talks once, and everyone tuned in (subscribers) hears it independently |

---

### 📦 Cloud Storage (File Handling)

| | |
|---|---|
| **What it does** | Stores and serves files (images, PDFs, videos, backups) at virtually unlimited scale |
| **Why chosen** | Highly durable (99.999999999%), cheap, and integrates with CDN and Cloud Functions |
| **Where it fits** | User-uploaded files, processed outputs, exported reports, static assets |
| **Trade-offs** | Not a file system — no native folder hierarchy (simulated with object key prefixes) |
| **Analogy** | Like a massive warehouse with infinite shelf space — every item (file) has a unique address, and retrieval is instant |

---

### 🌐 Cloud CDN (Content Delivery Network)

| | |
|---|---|
| **What it does** | Caches and serves static content from servers close to the user, globally |
| **Why chosen** | Dramatically reduces latency for users far from GCP's data centers |
| **Where it fits** | Serves static assets (JS, CSS, images, processed files) at the edge |
| **Trade-offs** | Cache invalidation adds complexity; not suitable for user-specific or dynamic content |
| **Analogy** | Like having local warehouses in every city instead of shipping everything from one central factory |

---

### 🔔 Firebase Push Notifications

| | |
|---|---|
| **What it does** | Sends real-time push notifications to iOS, Android, and web browsers |
| **Why chosen** | Native GCP integration; handles device token management and delivery at scale |
| **Where it fits** | Final step — notifies users when background jobs complete |
| **Trade-offs** | Delivery not guaranteed on all devices (OS-level throttling); requires device registration |
| **Analogy** | Like a text message from a courier: "Your package has arrived!" — you know instantly without checking the tracking page |

---

### 🛡️ Cloud IAM (Identity & Access Management)

| | |
|---|---|
| **What it does** | Controls which services and users can access which GCP resources |
| **Why chosen** | Principle of least privilege — every service only has access to what it needs |
| **Where it fits** | Applied to every service interaction — Cloud Run can read Cloud SQL but cannot delete it |
| **Trade-offs** | Misconfigured IAM can block legitimate access; requires careful role design |
| **Analogy** | Like an office security system — the intern can enter the break room but not the server room; the CTO has a master key |

---

### 📊 BigQuery (Analytics & Reporting)

| | |
|---|---|
| **What it does** | A serverless data warehouse that can query terabytes of data in seconds |
| **Why chosen** | Decouples analytics from production databases; no impact on live system performance |
| **Where it fits** | Receives all system events via Pub/Sub; powers dashboards and executive reports |
| **Trade-offs** | Not designed for real-time writes (small latency on ingestion); query costs can grow at scale |
| **Analogy** | Like a company's archive room — all historical records live there, and you can search through years of data in seconds |

---

### ⚙️ Google Kubernetes Engine — GKE (High-Scale Workloads)

| | |
|---|---|
| **What it does** | Runs containerized workloads on a managed Kubernetes cluster with auto-scaling |
| **Why chosen** | Handles jobs too heavy for Cloud Functions — long-running, stateful, or resource-intensive tasks |
| **Where it fits** | ML processing pipelines, batch export jobs, high-throughput data transformations |
| **Trade-offs** | More complex to manage than Cloud Run; requires Kubernetes knowledge |
| **Analogy** | Like a dedicated factory floor — while Cloud Run handles the storefront, GKE runs the heavy machinery in the back |

---

### ⚖️ Cloud Load Balancing

| | |
|---|---|
| **What it does** | Distributes incoming traffic across multiple Cloud Run instances automatically |
| **Why chosen** | Prevents any single instance from becoming a bottleneck; enables zero-downtime deployments |
| **Where it fits** | Sits in front of all user-facing API endpoints |
| **Trade-offs** | Adds a small layer of network overhead; must configure health checks carefully |
| **Analogy** | Like a bank with multiple tellers — the manager (load balancer) directs each customer to the next available window |

---

### 🔒 VPC (Virtual Private Cloud — Networking)

| | |
|---|---|
| **What it does** | Creates an isolated private network within GCP where services communicate securely |
| **Why chosen** | Prevents services from being exposed to the public internet unnecessarily |
| **Where it fits** | All internal service-to-service communication (Cloud Run → Cloud SQL, GKE → Firestore) |
| **Trade-offs** | Requires network architecture planning; misconfigured firewall rules can break communication |
| **Analogy** | Like a private office building — the outside world only sees the lobby (Load Balancer), while internal departments work behind locked doors |

---

### 📝 Cloud Logging & Cloud Monitoring

| | |
|---|---|
| **What it does** | Captures every log line from every service, and tracks metrics like latency, error rate, and CPU usage |
| **Why chosen** | You can't fix what you can't see — observability is essential for production systems |
| **Where it fits** | Cross-cutting layer attached to all services |
| **Analogy** | Like the security camera + health monitor in a hospital — always recording, alerting staff the moment something looks wrong |

---

### 🔑 Cloud Secret Manager

| | |
|---|---|
| **What it does** | Stores API keys, database passwords, and other secrets securely with versioning and access control |
| **Why chosen** | Secrets should never be hardcoded in code or environment variables; this provides a secure vault |
| **Where it fits** | Cloud Run and Cloud Functions fetch secrets at runtime; secrets are rotated without redeployment |
| **Trade-offs** | Adds a small latency overhead on secret fetch; requires IAM configuration per service |
| **Analogy** | Like a safe in the server room — only authorized staff with the right keycard can open it |

---

## 📈 Scalability & System Design

### How the System Scales

Scalability isn't just about adding more servers — it's about designing systems that can grow gracefully without requiring architectural changes.

---

#### Cloud Run Auto-Scaling

Cloud Run monitors incoming requests and automatically spins up new instances when load increases — and scales back to zero during idle periods.

```
100 requests/sec  →  5 Cloud Run instances
1000 requests/sec →  50 Cloud Run instances  (automatic)
0 requests/sec    →  0 instances (cost = $0)
```

> **Analogy:** Like a call center that hires temporary staff on busy days and sends them home when the phones go quiet — you only pay for active agents.

---

#### GKE for Heavy Workloads

For CPU/memory-intensive jobs (ML inference, large file processing), Cloud Run's limitations apply. GKE provides:

- **Horizontal Pod Autoscaler (HPA)** — adds more pods under load
- **Node Auto-provisioner** — adds VMs to the cluster when pods can't be scheduled
- **Spot VMs** — reduce cost for fault-tolerant batch jobs by ~70%

> **Analogy:** While Cloud Run is the storefront that flexes instantly, GKE is the factory floor that scales its machinery based on production demand.

---

#### Pub/Sub for Decoupling

Without Pub/Sub, a slow background job (like video transcoding) would block the API response. With Pub/Sub:

1. API publishes the event instantly and returns `202 Accepted`
2. Pub/Sub buffers the message safely
3. Workers process it at their own pace — even hours later if needed
4. If a worker fails, the message is retried automatically

> **Analogy:** Like dropping a letter in a mailbox — you don't wait for it to be delivered; you just trust the postal system to handle it.

---

#### CDN for Faster Delivery

Instead of serving every image and file from GCP's data centers (which may be far from some users), Cloud CDN caches content at **edge nodes** globally.

```
User in Mumbai → Edge Node in Mumbai (30ms)
                                     vs.
User in Mumbai → GCP Data Center in US (200ms)
```

> **Analogy:** Instead of flying from London to Tokyo to pick up your online order, a local warehouse in your city ships it overnight.

---

## 📊 Data & Analytics Pipeline

All system events follow this analytics pipeline:

```
API / Services
     │
     ▼
Cloud Pub/Sub (events streamed in real-time)
     │
     ▼
BigQuery (events land in append-only tables)
     │
     ▼
Looker Studio / Dashboards (business reports)
     │
     ▼
Future: Vertex AI (ML model training on historical data)
```

**What gets tracked:**
- Every file uploaded (size, type, user, timestamp)
- Every background job (duration, success/failure)
- Every push notification (sent, delivered, clicked)
- Every API call (latency, status code, endpoint)

This data never touches Cloud SQL or Firestore — it goes directly to BigQuery, so analytics never slow down your production database.

---

## 🔐 Security Design

### The Five Layers of Security

```
Layer 1: OAuth 2.0          → Who are you? (Authentication)
Layer 2: Cloud IAM          → What are you allowed to do? (Authorization)
Layer 3: VPC                → Can you even reach this service? (Network Isolation)
Layer 4: Cloud Secret Manager → Are credentials stored safely? (Secret Management)
Layer 5: Cloud Logging      → Did anyone do something suspicious? (Audit Trail)
```

---

### OAuth 2.0 Flow (Step-by-Step)

```
1. User clicks "Login with Google"
2. App redirects to Google's OAuth endpoint
3. User consents → Google issues an Authorization Code
4. Backend exchanges code for Access Token + ID Token (JWT)
5. JWT is validated on every API request
6. Token expires after 1 hour (refresh tokens handle re-auth silently)
```

> **Analogy:** Like a nightclub — you show your ID at the door (OAuth), get a wristband (JWT token), and security checks your wristband at every VIP area (IAM role check).

---

### IAM Role Design (Principle of Least Privilege)

| Service | Allowed To | Not Allowed To |
|---|---|---|
| Cloud Run API | Read/Write Cloud SQL | Delete Cloud SQL |
| Cloud Functions | Read Cloud Storage | Write to Cloud SQL |
| GKE Workers | Read Pub/Sub messages | Access Secret Manager |
| CI/CD Pipeline | Deploy Cloud Run | Access production database |

> **Analogy:** A cashier at a store can open the till but cannot access the safe. A manager can access the safe but cannot modify inventory records directly.

---

## 🔭 Observability: Logging & Monitoring

### Why Observability Matters

A production system without observability is like flying a plane without instruments. You might be fine — or you might already be crashing and not know it.

---

### Cloud Logging

Every service automatically emits structured logs:

```json
{
  "severity": "ERROR",
  "service": "upload-api",
  "message": "File processing failed",
  "fileId": "f_abc123",
  "userId": "u_12345",
  "error": "Timeout after 30s",
  "timestamp": "2025-04-25T10:30:00Z"
}
```

Logs are searchable, filterable, and retained for 30 days (configurable). Log-based alerts notify on-call engineers when error rates spike.

---

### Cloud Monitoring

Key metrics tracked in real time:

| Metric | Alert Threshold | Why It Matters |
|---|---|---|
| API Latency (p99) | > 2000ms | Users experience slowness |
| Error Rate | > 1% of requests | Something is broken |
| Cloud Run Instances | > 80 instances | Scaling limit approaching |
| Pub/Sub Message Age | > 5 minutes | Consumers are falling behind |
| Cloud SQL Connections | > 80% of limit | Connection pool exhaustion risk |

> **Analogy:** Like the dashboard of a car — you don't stare at it constantly, but when the engine warning light turns on, you know immediately.

---

## 🛡️ Failure Handling & Reliability

### Cloud Tasks — Retry Logic

Cloud Tasks retries failed jobs with **exponential backoff**:

```
Attempt 1: Fails → wait 10 seconds
Attempt 2: Fails → wait 30 seconds
Attempt 3: Fails → wait 2 minutes
Attempt 4: Fails → wait 10 minutes
Attempt 5: Fails → move to dead-letter queue
```

> **Analogy:** Like a courier who can't deliver your package — they try again the next day, then the day after, with increasing intervals. After 5 attempts, the package goes to the undeliverable bin for manual review.

---

### Pub/Sub — Dead-Letter Queues

If a Pub/Sub subscriber keeps failing to process a message (e.g., due to a code bug), the message is automatically moved to a **Dead-Letter Topic** after a configurable number of retries.

```
Normal Topic → Subscriber fails 5 times → Dead-Letter Topic
                                                   │
                                                   ▼
                                        Alert sent to engineers
                                        Message preserved for replay
```

This ensures no events are silently lost — they're parked safely for investigation and reprocessing.

---

### Idempotency

Because Pub/Sub guarantees *at-least-once* delivery (a message may arrive more than once), all consumers are designed to be **idempotent** — processing the same event twice produces the same result as processing it once.

```
// Example: file thumbnail generation
if (thumbnail_already_exists(fileId)) {
    return;  // Skip — don't generate a duplicate
}
generate_thumbnail(fileId);
```

> **Analogy:** Like a light switch — flipping it ON when it's already ON doesn't cause a problem. Same result, no harm done.

---

### Graceful Degradation

If BigQuery ingestion fails, the production system continues running — analytics are non-critical. If Firebase notifications fail, the file is still processed — the user can check manually. Critical paths (auth, file save, API response) are isolated from non-critical ones (analytics, notifications).

---

## 🚀 Deployment & CI/CD

### Pipeline Overview

```
Developer pushes code to GitHub
          │
          ▼
Cloud Build triggers automatically
          │
     ┌────┴───────────────────────────────────┐
     │  1. Run unit & integration tests        │
     │  2. Build Docker container image        │
     │  3. Push image to Artifact Registry     │
     │  4. Deploy to Cloud Run (staging)       │
     │  5. Run smoke tests                     │
     │  6. Deploy to Cloud Run (production)    │
     └─────────────────────────────────────────┘
          │
          ▼
Traffic gradually shifts to new version (10% → 50% → 100%)
If error rate spikes → automatic rollback to previous version
```

### Containerization

All services run as **Docker containers**, defined by a `Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Containers ensure the code runs identically in development, staging, and production — no "it works on my machine" problems.

### Traffic Splitting for Zero-Downtime Deployments

Cloud Run supports gradual traffic rollout:

```
v1.0 → 90% of traffic
v1.1 → 10% of traffic (canary)

If v1.1 error rate is normal after 15 minutes:
→ v1.1 → 100% of traffic
→ v1.0 decommissioned
```

---

## 🔮 Future Improvements

| Improvement | Why | When to Prioritize |
|---|---|---|
| **Vertex AI Integration** | Add ML-powered features (smart search, content moderation, recommendations) | When user base exceeds 100k |
| **Multi-Region Deployment** | Reduce latency globally, achieve 99.99% uptime SLA | When international users exceed 20% |
| **Cloud Spanner** | Replace Cloud SQL for globally distributed, horizontally scalable relational data | When SQL becomes a bottleneck |
| **Apigee API Gateway** | Advanced rate limiting, API versioning, developer portal | When exposing APIs to third-party developers |
| **Workload Identity Federation** | Eliminate service account keys entirely for CI/CD | Security hardening milestone |
| **gVisor Sandboxing on GKE** | Stronger container-level security isolation | When handling sensitive regulated data |
| **VPC Service Controls** | Prevent data exfiltration at the network level | Enterprise/compliance requirements |

---

## 📋 Tech Stack Summary

| Category | Service | Purpose |
|---|---|---|
| **Authentication** | OAuth 2.0 / GCP Identity Platform | Secure user login |
| **API Layer** | Cloud Run | Scalable, containerized REST API |
| **Load Balancing** | Cloud Load Balancing | Traffic distribution across instances |
| **Relational Database** | Cloud SQL (PostgreSQL) | Structured, transactional data |
| **NoSQL / Real-time DB** | Cloud Firestore | Live feeds, sessions, notifications |
| **File Storage** | Cloud Storage | User uploads, processed files |
| **CDN** | Cloud CDN | Global edge caching |
| **Event Bus** | Cloud Pub/Sub | Asynchronous event-driven architecture |
| **Background Jobs** | Cloud Tasks | Scheduled and retried job queue |
| **Lightweight Workers** | Cloud Functions | Event-triggered microservices |
| **Heavy Workloads** | Google Kubernetes Engine (GKE) | ML/batch processing at scale |
| **Push Notifications** | Firebase Cloud Messaging | Real-time user notifications |
| **Access Control** | Cloud IAM | Role-based permissions |
| **Secret Management** | Cloud Secret Manager | Secure credential storage |
| **Analytics** | BigQuery | Data warehouse for reporting |
| **Networking** | VPC | Private, isolated network |
| **Logging** | Cloud Logging | Centralized structured log management |
| **Monitoring** | Cloud Monitoring | Metrics, alerts, dashboards |
| **CI/CD** | Cloud Build + Artifact Registry | Automated build and deployment |

---

## 🤝 Contributing

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please ensure all new services are documented with the standard service breakdown format (What / Why / Where / Trade-offs / Analogy).

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

> **Built with ❤️ on Google Cloud Platform**
> *Designed to be simple enough to explain in 10 minutes, robust enough to serve millions.*