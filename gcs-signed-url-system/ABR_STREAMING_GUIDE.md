# System Design: Adaptive Bitrate Streaming (ABR)

Adaptive Bitrate Streaming is the technology behind Netflix, YouTube, and Twitch. It ensures that video playback remains smooth regardless of the user's internet speed by dynamically switching between different quality levels.

---

## 1. The Core Problem: The "Spinning Wheel"
When you stream a raw `.mp4` file, the browser must download the file sequentially. If the internet slows down, the buffer runs dry, and the video stops.

**The Solution (ABR):**
- **Slicing:** Break the video into tiny 2-second segments.
- **Multi-Quality:** Create copies of every segment in 360p, 720p, and 1080p.
- **Manifest:** Create a "Master Index" (`.m3u8`) that tells the player where all these versions are.
- **Switching:** The player constantly measures download speed. If speed drops, it fetches the next 2-second segment from the 360p folder instead of 1080p.

---

## 2. Our Pipeline Architecture

### A. The Ingestion
The user uploads a high-quality "Master" video to our GCS bucket using the **Resumable Upload** pattern we implemented.

### B. The Processing (VOD Pipeline)
We use an event-driven trigger (Eventarc) to start a **Transcoding Job**.
- **Service:** Google Cloud Transcoder API.
- **Input:** `gs://bucket/uploads/movie.mp4`
- **Output:**
  - `processed/movie/360p/seg_0.ts`, `seg_1.ts`...
  - `processed/movie/720p/seg_0.ts`, `seg_1.ts`...
  - `processed/movie/master.m3u8` (The "Playbook")

### C. The Delivery
The browser cannot play HLS natively (except Safari). We use **HLS.js**, a library that:
1. Downloads the `.m3u8` manifest.
2. Periodically fetches the small `.ts` segments.
3. Feeds them into the browser's MediaSource API.

---

## 3. Key System Design Trade-offs

| Feature | Standard MP4 | HLS (ABR) |
| :--- | :--- | :--- |
| **Start Time** | Slow (must buffer head) | Instant (starts with low-res) |
| **Reliability** | Fails on slow networks | Adapts and keeps playing |
| **Storage Cost** | Low (1 file) | High (3-4x size due to multiple resolutions) |
| **CPU Cost** | Zero | High (requires heavy transcoding) |

---

## 4. How to Implement

### Step 1: Enable APIs
```bash
gcloud services enable transcoder.googleapis.com
```

### Step 2: Configure CORS
HLS players perform many small requests. Your bucket must allow `GET` for `.m3u8` and `.ts` files.

---
Created as part of the System Design Practical Projects.
