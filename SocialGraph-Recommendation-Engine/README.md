# SocialGraph: Recommendation & Fraud Engine

> A high-performance graph processing system built with **Neo4j** and **Spring Boot**, designed to solve complex relationship problems like "People You May Know" and "Fraudulent Bot Ring Detection."

---

## 📖 The "Graph" Mental Model
In a standard SQL database, finding "Friends of Friends" requires multiple expensive `JOIN` operations. In a **Graph Database**, we treat relationships (Edges) as first-class citizens. Moving from one person to their 1,000,000th connection is a simple "Traversal" that happens in constant time.

| Topic | Relational (SQL) | Graph (Neo4j) |
|---|---|---|
| **Data Model** | Tables & Rows | Nodes & Relationships |
| **Connections** | Foreign Keys (Joins) | Pointers (Traversals) |
| **Query Language** | SQL | Cypher (Pattern Matching) |
| **Best For** | Transactions (Ledgers) | Relationships (Social/Fraud) |

---

## 🏗️ System Architecture

```
  Frontend (React/D3.js)
          │
          ▼
┌─────────────────────────────┐
│    Spring Boot Backend      │  ← Ingestion & Cypher Query Logic
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│      Neo4j Database         │  ← The Graph Engine
│    (Running in Docker)      │
└─────────────────────────────┘
```

---

## 💎 High-Level Design (HLD) Features

### 1. "People You May Know" (Social Discovery)
**The Problem:** Suggesting new friends based on mutual connections.
**The Graph Solution:** We find a "Triangle" that isn't closed yet. 
- *Query:* `(A)-[:FOLLOWS]->(B)-[:FOLLOWS]->(C)` where `A` is not yet connected to `C`.

### 2. Interest-Based Recommendations
**The Problem:** Suggesting groups or products based on what similar people like.
**The Graph Solution:** Collaborative Filtering. 
- *Query:* Find users who "Like" the same `(Topic)` as you, and see what *other* topics they like that you haven't discovered yet.

### 3. Fraudulent Ring Detection (Security)
**The Problem:** Bots often follow each other in circles to manipulate algorithms.
**The Graph Solution:** Strongly Connected Components (SCC).
- *Query:* Find clusters of nodes where every node can reach every other node in a closed loop. These are likely "Bot Farms."

---

## 🛠️ Tech Stack
- **Database:** Neo4j 5.x (Graph Database)
- **Query Language:** Cypher
- **Backend:** Java 17 + Spring Boot + Spring Data Neo4j
- **Environment:** Docker & Docker Compose
- **Visualization:** Cytoscape.js / Neovis.js

---

## 📂 Project Structure
```
SocialGraph-Engine/
├── docker-compose.yml       # Neo4j & APOC Plugin setup
├── backend/                 # Spring Boot Graph Service
│   ├── src/main/java/
│   │   ├── model/           # @Node and @Relationship entities
│   │   ├── repository/      # Cypher-powered repositories
│   │   └── service/         # Recommendation logic
├── frontend/                # Graph Visualization Dashboard
└── cypher-scripts/          # Pre-defined graph algorithms
```

---

## 🚀 Quick Start (Development)

### 1. Start the Graph Engine
```bash
docker-compose up -d
```

### 2. Access Neo4j Browser
Go to `http://localhost:7474`. 
- **Username:** `neo4j`
- **Password:** `password123` (We will set this in Docker)

---

## 🛰️ Roadmap
- [ ] **Phase 1:** Docker Setup & Node/Relationship Schema.
- [ ] **Phase 2:** "Follow" & "Interest" Ingestion APIs.
- [ ] **Phase 3:** Recommendation Engine (Cypher queries).
- [ ] **Phase 4:** Visualization Dashboard (See the graph live!).
- [ ] **Phase 5:** Fraud Analysis (Detecting clusters).

---
> **"It's not about the data; it's about the connections between the data."**
