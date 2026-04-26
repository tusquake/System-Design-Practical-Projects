# 🛡️ Global Rate Limiter: System Design

## 📖 Overview
A Rate Limiter is a service that controls the rate of traffic sent by a client. If the number of requests exceeds the limit, the service blocks the excess requests (usually with a `429 Too Many Requests` status).

## 🚀 Why "Global"?
In a distributed system, a client might hit **Server A** for the first request and **Server B** for the second. A local memory-based limiter would fail. We use a **Centralized Redis Store** to keep a global count that all servers can check.

## 🧠 Key Algorithms

### 1. Token Bucket (Our Choice)
- **Concept:** A bucket has a maximum capacity of `N` tokens. Tokens are added at a constant rate (e.g., 10 per second). Each request takes 1 token. If the bucket is empty, the request is rejected.
- **Pros:** Handles "Bursts" of traffic gracefully.
- **Why it's elite:** It’s the industry standard used by **Amazon** and **Stripe**.

### 2. Sliding Window Log
- **Concept:** Keep a timestamp of every request in a sorted set. To check the limit, count the number of timestamps in the last `X` seconds.
- **Pros:** Extremely accurate.
- **Cons:** High memory usage at scale.

---

## 🏗️ Technical Architecture

```
  Client Request
       │
       ▼
┌─────────────────────────────┐
│      API Gateway / App      │
│  (Rate Limiter Middleware)  │
└────────────┬────────────────┘
             │ (Atomic Lua Script)
             ▼
┌─────────────────────────────┐
│       Redis Cluster         │  ← "The Source of Truth"
│ (Stores token counts & TTL) │
└─────────────────────────────┘
```

## ⚡ The "Lua Script" Trick (Atomic Operations)
In a distributed system, two servers might check the count at the same millisecond, see "1 token left," and both allow the request. This is a **Race Condition**.
- **Solution:** We send a **Lua Script** to Redis. Redis executes the entire script (Check -> Increment -> Return) in one single atomic step. **No one can interrupt it.**

---

## 🛠️ Tech Stack
- **Engine:** Redis (Running in Docker)
- **Framework:** Spring Boot 3.2
- **Persistence:** Spring Data Redis (Reactive for high performance)
- **Strategy:** Token Bucket via Lua

---
> **"A system without a rate limiter is a system waiting to be DDoS'd."**
