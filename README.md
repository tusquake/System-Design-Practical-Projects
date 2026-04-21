# The System Design Lab: Practical Implementations

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

This repository is a comprehensive collection of real-world system design patterns implemented from scratch. Instead of just theoretical diagrams, this lab focuses on building the actual infrastructure to understand the trade-offs in scalability, availability, and performance.

## The Core Pillars
This project covers the essential building blocks of modern software architecture:

### 1. Data Management and Scalability
- **Database Optimization:** Indexing strategies, query tuning, and partitioning in PostgreSQL.
- **Scaling Patterns:** Practical examples of Horizontal Sharding, Read Replicas, and NoSQL integration.
- **Caching:** Implementing distributed caching patterns (Look-aside, Write-through) using Redis.

### 2. Communication and Integration
- **Asynchronous Processing:** Event-driven architecture using Message Queues (RabbitMQ/Kafka).
- **API Design:** Building resilient REST, gRPC, and GraphQL interfaces with proper Rate Limiting.
- **Load Balancing:** Service discovery, circuit breakers, and traffic management strategies.

### 3. Storage and Security
- **Cloud Storage:** High-throughput file upload systems (GCS/S3) with secure signed URL patterns.
- **Security:** Implementing OAuth2, JWT, and Zero Trust principles in distributed services.

### 4. Advanced Topics
- **AI Infrastructure:** Scalable LLM evaluation pipelines and vector database (Pinecone/Milvus) integrations.
- **Observability:** Centralized logging (ELK), distributed tracing (Jaeger), and Prometheus/Grafana monitoring.

---

## Featured Projects

### [GCS Signed URL System](./gcs-signed-url-system)
A production-grade implementation of direct-to-cloud file uploads with a decoupled metadata service.
- **Tech Stack:** Spring Boot, Google Cloud Storage, Cloud SQL (PostgreSQL), Vanilla JS.
- **Key Features:** V4 Signed URLs, CORS configuration, metadata persistence, and cross-origin security.

### [Serverless File Processor](./gcs-file-processor)
An event-driven enhancement using Google Cloud Functions (the equivalent of AWS Lambda).
- **Tech Stack:** Python, Google Cloud Functions, Eventarc.
- **Key Features:** Asynchronous processing triggered by GCS "Object Finalize" events, enabling serverless background tasks like metadata extraction or thumbnail generation without blocking the main application.

---

## Engineering Lessons and Logical Concepts

This section documents the architectural logic and the real-world troubleshooting steps encountered during the development of these systems.

### 1. Direct-to-Cloud Upload Logic (Signed URLs)
**The Concept:** Instead of the user sending a 1GB file to our Spring Boot server (which would bottleneck our bandwidth and memory), the server simply generates a "Signed URL".
- **Step 1:** Browser requests a Signed URL for a specific file.
- **Step 2:** Backend verifies the user and asks GCS for a temporary, cryptographically signed permission link.
- **Step 3:** Browser uses that link to upload the file **directly** to GCS.
- **Benefit:** High scalability and reduced server cost.

### 2. Event-Driven Architecture (Cloud Functions)
**The Concept:** The system uses "triggers" to react to changes automatically.
- **Trigger:** `google.storage.object.finalize`
- **Logic:** We don't "poll" the bucket to see if a file is there. Instead, GCS pushes an event to the Cloud Function the millisecond an upload is finished.
- **Troubleshooting - IAM Permissions:** In 2nd Gen functions, GCS requires the `roles/pubsub.publisher` role to send events to Eventarc. Without this, the trigger creation will fail with a "Permission Denied" error.

### 3. Security and Git Best Practices
- **GitHub Push Protection:** We encountered a block when attempting to push a Google Cloud Service Account key (`.json`). 
- **The Solution:** Secrets should **never** be committed. We used `git filter-repo` principles (or `git commit --amend`) to remove the secret from the history entirely and added a robust `.gitignore`.
- **Lesson:** Security at the "Push" level is the last line of defense against credential leakage.

### 4. Cross-Origin Resource Sharing (CORS)
- **The Problem:** Browsers block requests from one domain (localhost) to another (google-storage) for security.
- **The Solution:** We must configure a CORS policy on the GCS bucket to allow `PUT` and `GET` requests from our frontend origin.

### 5. Dependency and Runtime Troubleshooting
- **Maven Resolution:** Encountered `NoClassDefFoundError` for Spring Data JPA.
- **The Fix:** Adding dependencies to `pom.xml` is not enough; the local environment must be refreshed (`mvn clean install`) to sync the classpath with the project configuration.

---

## Universal Tech Stack
...
- **Languages:** Java (Spring Boot), Python (FastAPI/Django)
- **Data:** PostgreSQL, Redis, Kafka, Elasticsearch
- **Infrastructure:** Docker, Kubernetes, GCP/AWS
- **AI:** Google GenAI SDK, OpenAI API

## Contributing
Found a bug or want to add a new system design pattern? Contributions are welcome! Please feel free to submit a Pull Request.
