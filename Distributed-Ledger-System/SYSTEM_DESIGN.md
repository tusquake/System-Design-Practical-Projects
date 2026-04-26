# 🏛️ System Design: Distributed Ledger System

A high-scale, immutable, and ACID-compliant ledger system designed for financial accuracy and high-concurrency transactions.

---

## 1. The Foundation: Double-Entry Accounting
The most critical rule of a ledger: **Money is never created or destroyed; it is only moved.**
- **The Equation:** `Assets = Liabilities + Equity`.
- **The Constraint:** Every transaction MUST have at least one **Debit** and one **Credit** that sum to zero. 
- **Auditability:** We never "update" a balance directly by overwriting a row. Instead, we append a new entry to the `ledger_entries` table. The current balance is the sum of all previous entries.

---

## 2. High-Level Architecture

### Ingestion Layer (Spring Boot)
- Validates the transaction (e.g., "Does User A have enough funds?").
- Generates a unique **Idempotency Key** to prevent double-spending.

### Persistence Layer (The Source of Truth)
- **PostgreSQL:** Chosen for its strict **ACID compliance** and row-level locking.
- **Partitioning:** As the ledger grows to millions of rows, we partition the `ledger_entries` table by `created_at` or `account_id` to keep queries fast.

### Caching Layer (Redis)
- Stores "Read-Only" balances for quick UI display.
- **Note:** The cache is never the source of truth; it is eventually consistent with the DB.

---

## 3. Concurrency Control (The Race Condition Problem)
When two transactions try to withdraw from the same account at the same millisecond:

### Strategy A: Pessimistic Locking (`SELECT FOR UPDATE`)
- **How:** The database locks the "Account" row until the transaction finishes.
- **Trade-off:** High consistency but lower throughput (other transactions must wait).
- **Use Case:** High-value banking transactions.

### Strategy B: Optimistic Locking (`Version` column)
- **How:** The update only succeeds if the `version` number matches the one we read.
- **Trade-off:** High throughput but retries are needed if collisions occur.
- **Use Case:** Social media "likes" or low-value wallet transfers.

---

## 4. Distributed Transactions & The Saga Pattern
In a distributed system where the "Sender Account" is in one database and the "Receiver Account" is in another:

### The Problem: Partial Failure
What if we subtract money from A, but the network fails before we add it to B?

### The Solution: The Saga Pattern
- **Choreography-based Saga:** Each service publishes an event. If the second step fails, it publishes a "Compensating Event" to refund the first account.
- **Orchestration-based Saga:** A central "Saga Manager" controls the flow and ensures atomic-like behavior across services.

---

## 5. Reliability Patterns

### 🛡️ Idempotency
Clients might retry a request due to a timeout.
- **Mechanism:** The system stores the `transaction_id` in a `processed_transactions` table. If the same ID arrives again, the system returns the previous success response instead of processing it again.

### 📜 Event Sourcing
Instead of storing the current state, we store the sequence of events.
- **Benefit:** You can "replay" the entire history of an account to find exactly where an error occurred. It provides a 100% perfect audit trail for regulators.

---

## 6. Performance vs. Accuracy Trade-offs

| Feature | Design Choice | Reason |
|---|---|---|
| **Database** | Relational (RDBMS) | ACID over Scalability (CAP Theorem: C over A) |
| **Balance Check** | Sum of Ledger Entries | Prevents "Ghost Money" |
| **Writes** | Append-Only | Immutability & Auditability |
| **Scaling** | Sharding by AccountID | Allows the system to grow horizontally |

---
> **"In a ledger, correctness is not a feature; it is the only requirement."**
