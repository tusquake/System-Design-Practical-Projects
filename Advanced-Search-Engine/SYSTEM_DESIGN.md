# 🔍 Advanced Search Engine: System Design

## 📖 Overview
A search engine is not a database. While a database is good at finding "Exactly $100.00," a search engine is good at finding "Blue running shoes with a discount" among millions of items.

## 🚀 The Core Secret: The Inverted Index
Instead of storing "Document -> Words," Elasticsearch stores **"Word -> List of Documents."**
*   *Example:* If you search for "Apple," ES immediately looks at the "Apple" entry in its index and sees it's in Doc 1, Doc 45, and Doc 90. **Zero scanning required.**

---

## 🧠 Key Search Concepts

### 1. Analysis Pipeline (Normalization)
Before data is saved, it goes through:
- **Tokenizer:** Breaks "I love coding" into ["I", "love", "coding"].
- **Lowercase:** Changes "Coding" to "coding."
- **Stemming:** Changes "Running" to "run." This way, a search for "run" finds "running."
- **Stop-words:** Removes useless words like "the," "is," and "at."

### 2. Fuzzy Matching (Levenshtein Distance)
Handles typos. If a user types "iphne," the system calculates that it's only 1 character away from "iphone" and shows the result anyway.

### 3. Relevance Scoring (BM25)
Why is one result #1 and another #10?
- **TF (Term Frequency):** How many times does the word appear in the doc?
- **IDF (Inverse Document Frequency):** If the word is rare (like "Kafka"), it's more important than a common word (like "Java").

---

## 🏗️ Technical Architecture

```
   Search Query
        │
        ▼
┌─────────────────────────────┐
│      Spring Boot API        │  ← Query DSL Construction
└────────────┬────────────────┘
             │ (JSON Query)
             ▼
┌─────────────────────────────┐
│    Elasticsearch Cluster    │  ← The Inverted Index
│     (Nodes & Shards)        │
└─────────────────────────────┘
```

## 🛠️ Tech Stack
- **Engine:** Elasticsearch 8.12 (via Docker)
- **Framework:** Spring Boot 3.2
- **Persistence:** Spring Data Elasticsearch
- **Visualization:** Kibana (Optional Dashboard)

---
> **"In a database, you find data. In a search engine, you discover relevance."**
