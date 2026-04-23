# System Design Patterns in CloudStream

This document breaks down the high-level architectural patterns implemented in this project. These patterns are the industry standard for building scalable, resilient, and high-performance cloud applications.

---

### 1. Valet Key Pattern
**Implemented via:** GCS V4 Signed URLs.

- **The Problem:** Passing large binary data through an application server causes high CPU/RAM usage and creates a bottleneck.
- **The Solution:** The backend (the Valet) provides the client with a time-limited, restricted-access URL (the Key). The client then communicates directly with the storage provider (GCS).
- **Benefit:** Massive scalability. The backend only handles tiny metadata requests while GCS handles the heavy multi-gigabit data transfer.

### 2. Event-Driven Architecture (EDA)
**Implemented via:** GCS Object Finalize Triggers & Cloud Functions.

- **The Concept:** Components communicate through "Events" rather than direct calls. When a file is uploaded, GCS emits an event that "wakes up" the processing pipeline.
- **Benefit:** Loose Coupling. The upload system doesn't need to know about the AI summarizer or the Video Transcoder. Each component acts independently, making the system easier to maintain and scale.

### 3. Asynchronous Worker Pattern
**Implemented via:** Google Cloud Functions (Python).

- **The Concept:** Heavy, time-consuming tasks (AI and Transcoding) are offloaded to background workers.
- **Benefit:** Non-blocking UI. The user gets an instant confirmation that their upload started, while the "heavy lifting" happens silently in the background without slowing down the main website.

### 4. State Machine Pattern
**Implemented via:** `status` field in PostgreSQL (PENDING -> PROCESSING -> READY).

- **The Concept:** The system tracks the "lifecycle" of a resource. Each stage of the pipeline updates the database to reflect the current state.
- **Benefit:** Reactive UI. The frontend can query the state and show users real-time feedback (like pulsing badges) instead of leaving them guessing if the process finished.

### 5. Proxy & Edge Caching Pattern
**Implemented via:** Google Cloud CDN & Global Load Balancer.

- **The Concept:** A reverse proxy sits in front of the storage and "caches" content at edge locations (Point of Presence) physically close to the user.
- **Benefit:** Reduced Latency. A user in Europe doesn't have to wait for data to travel from a US data center; they get it from a local Google server, resulting in instant video start times.

### 6. Strategy Pattern (Adaptive Bitrate)
**Implemented via:** HLS (HTTP Live Streaming) & Hls.js.

- **The Concept:** The client-side player dynamically chooses a "Strategy" (720p, 480p, 360p) based on real-time network conditions.
- **Benefit:** Superior User Experience. The video never stops to buffer; it simply drops quality if the internet slows down and raises it when the connection improves.

### 7. Resumable Upload Pattern
**Implemented via:** GCS Resumable Session URLs.

- **The Concept:** Instead of one giant PUT request, the upload is managed via a stateful session that tracks how many bytes have been successfully received.
- **Benefit:** Fault Tolerance. If a user's connection drops at 500MB of a 1GB file, they can resume from exactly where they left off instead of starting from zero.

---
*Created as part of the System Design Practical Projects.*
