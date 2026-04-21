# TinyLink: High-Performance URL Shortener

TinyLink is a system design project focused on low-latency redirects and efficient data mapping. It demonstrates how to handle massive read traffic using distributed caching and optimized hashing algorithms.

---

## System Design Architecture

The core of a URL shortener is the mapping between a **Short Code** and a **Long URL**. 

### The Redirect Flow (Read Path)
1. **Request:** User hits `tiny.link/5B2z9`.
2. **Cache Check:** Backend checks **Redis** for the key `5B2z9`.
3. **Cache Hit:** If found, redirect to Long URL immediately (Latency < 10ms).
4. **Cache Miss:** If not in Redis, query **PostgreSQL**.
5. **Update Cache:** If found in DB, write back to Redis and then redirect.

### The Shortening Flow (Write Path)
1. **Input:** User submits `https://very-long-url.com/xyz...`.
2. **Hashing/Encoding:** 
   - Option A: MD5/SHA256 (requires collision handling).
   - Option B: **Counter-based Base62 Encoding** (Sequential and unique).
3. **Persistence:** Save the mapping to PostgreSQL.
4. **Return:** Provide the user with the shortened link.

---

## Core Pillars & Concepts

### 1. Base62 Encoding
We use a set of 62 characters `[a-z, A-Z, 0-9]` to represent our database IDs.
- A 6-character short link can represent **56.8 Billion** unique URLs ($62^6$).

### 2. Low Latency with Redis
Since 99% of the traffic is "reading" (redirecting), we use Redis to keep the most popular links in memory.

### 3. Handling Collisions
In high-scale systems, we use a **Unique ID Generator** (like Snowflake or a DB Sequence) to ensure no two links ever get the same hash.

---

## Technical Stack
- **Backend:** Spring Boot 3.x
- **Database:** PostgreSQL (Managed on Cloud SQL)
- **Cache:** Redis
- **Frontend:** Vanilla JS / Tailwind CSS

---
Created as a System Design Practical Project.
