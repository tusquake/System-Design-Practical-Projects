# The System Design Lab: Practical Implementations

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

This repository is a comprehensive collection of real-world system design patterns implemented from scratch. Instead of just theoretical diagrams, this lab focuses on building the actual infrastructure to understand the trade-offs in scalability, availability, and performance.

## 🏛️ The Core Pillars
This project covers the essential building blocks of modern software architecture:

### 1. Data Management & Scalability
- **Database Optimization:** Indexing strategies, query tuning, and partitioning in PostgreSQL.
- **Scaling Patterns:** Practical examples of Horizontal Sharding, Read Replicas, and NoSQL integration.
- **Caching:** Implementing distributed caching patterns (Look-aside, Write-through) using Redis.

### 2. Communication & Integration
- **Asynchronous Processing:** Event-driven architecture using Message Queues (RabbitMQ/Kafka).
- **API Design:** Building resilient REST, gRPC, and GraphQL interfaces with proper Rate Limiting.
- **Load Balancing:** Service discovery, circuit breakers, and traffic management strategies.

### 3. Storage & Security
- **Cloud Storage:** High-throughput file upload systems (GCS/S3) with secure signed URL patterns.
- **Security:** Implementing OAuth2, JWT, and Zero Trust principles in distributed services.

### 4. Advanced Topics
- **AI Infrastructure:** Scalable LLM evaluation pipelines and vector database (Pinecone/Milvus) integrations.
- **Observability:** Centralized logging (ELK), distributed tracing (Jaeger), and Prometheus/Grafana monitoring.

---

## 📂 Featured Projects

### [GCS Signed URL System](./gcs-signed-url-system)
A production-grade implementation of direct-to-cloud file uploads. 
- **Tech Stack:** Spring Boot, Google Cloud Storage, Vanilla JS.
- **Key Features:** V4 Signed URLs, CORS configuration, metadata persistence in PostgreSQL.

---

## 🎯 Why This Repository?
Most resources focus on *how to pass an interview*. This lab focuses on *how to build the system*. Each module includes:
1. **The Problem:** The real-world bottleneck or architectural challenge.
2. **The Code:** A clean, production-ready implementation.
3. **The Trade-offs:** An analysis of why we chose this specific approach over others.

## 🧰 Universal Tech Stack
- **Languages:** Java (Spring Boot), Python (FastAPI/Django)
- **Data:** PostgreSQL, Redis, Kafka, Elasticsearch
- **Infra:** Docker, Kubernetes, GCP/AWS
- **AI:** Google GenAI SDK, OpenAI API

## 🤝 Contributing
Found a bug or want to add a new system design pattern? Contributions are welcome! Please feel free to submit a Pull Request.
