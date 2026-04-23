# Global Content Delivery (Cloud CDN)

This system utilizes **Google Cloud CDN** and a **Global HTTP(S) Load Balancer** to serve video content at the "Edge" of Google's network.

---

### 1. The Architecture
Without a CDN, every user has to fetch video directly from your storage bucket, which can be slow if they are far away.
- **Our Setup:** `Browser` -> `Cloud CDN (Edge Node)` -> `External HTTP(S) Load Balancer` -> `GCS Backend Bucket`.

### 2. Key Components
- **Global Load Balancer:** Provides a single, static IP address (`34.8.62.41`) that routing traffic to the closest Google data center.
- **Cloud CDN:** Caches the video segments (`.ts`) and manifests (`.m3u8`) at Google's Point of Presence (PoP) locations worldwide.
- **Backend Bucket:** The source of truth (your GCS bucket) where the processed videos are stored.

### 3. Caching Logic (HIT vs MISS)
- **Cache MISS:** The first time a video segment is requested, the CDN fetches it from GCS. This takes a bit longer.
- **Cache HIT:** Every subsequent request for that segment is served directly from the CDN's memory. This results in **sub-10ms** latency and zero buffering.

### 4. Implementation Details
- **Signed URLs vs. CDN:** We use **Signed URLs** for private uploads/downloads, but we use the **Public CDN IP** for high-traffic streaming. This balances security with performance.
- **CORS Configuration:** The Load Balancer and GCS bucket are configured with `Access-Control-Allow-Origin: *` to allow the frontend to fetch segments across different domains.

---
*Created as part of the System Design Practical Projects.*
