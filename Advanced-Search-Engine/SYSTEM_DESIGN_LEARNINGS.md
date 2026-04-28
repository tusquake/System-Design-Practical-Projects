# 🎓 System Design Learnings: Advanced Search Architecture

Building a search engine is a transition from **Exact Matching** (Databases) to **Relevance Discovery**. Below are the key topics we explored.

## 1. The Inverted Index (The "Why")
- **Concept:** Unlike a standard database index (B-Tree), an inverted index maps every unique word to the list of documents it appears in.
- **Analogy:** It’s like the index at the back of a textbook. You look up "Photosynthesis" to find page numbers, rather than reading every page.

## 2. The Analysis Pipeline
Data isn't just "saved"; it is processed through:
- **Tokenization:** Splitting text into individual units (tokens).
- **Lowercasing:** Ensuring search isn't case-sensitive.
- **Stemming:** Reducing words to their root (e.g., "running" → "run").
- **Stop-word Removal:** Dropping common words (a, an, the, is) to save space and focus on meaning.

## 3. Advanced Query DSL (Domain Specific Language)
- **Fuzzy Queries:** Using *Levenshtein Distance* to handle typos.
- **Multi-Match Queries:** Searching across several fields (Name, Description, Category) at once.
- **Boosting:** Assigning weights (e.g., `name^3`) to prioritize certain fields over others.

## 4. Aggregations (Faceting)
- **Problem:** How do you count items in categories across millions of results?
- **Solution:** Aggregations perform real-time "Group By" operations during the search phase to provide counts for UI filters.

## 5. Intelligence Features
- **Completion Suggester:** A specialized data structure (FST - Finite State Transducer) optimized for sub-millisecond prefix lookups (Autocomplete).
- **Geo-Spatial Indexing:** Storing coordinates as `geo_point` and using mathematical formulas (Haversine) to filter by distance.
- **Highlighting:** The engine identifies the exact snippet that matched and wraps it in tags (`<mark>`) for the frontend.

## 6. Distributed Nature
- **Sharding:** Breaking the index into smaller pieces (shards) to distribute across multiple servers.
- **Replication:** Keeping copies of shards for high availability and faster read performance.
