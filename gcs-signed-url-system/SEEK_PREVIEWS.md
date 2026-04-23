# Seek Previews (Netflix-style Thumbnails)

This document explains the technical implementation of the video seek preview feature, which displays frame thumbnails as you move your mouse across the video progress bar.

---

### 1. The Strategy: Sprite Sheets
Instead of downloading 100 separate image files (which would be slow and hit the server with too many requests), we use a **Sprite Sheet**.
- **The Concept:** All 100 preview frames are combined into a single large image grid (10x10).
- **The File:** `preview0000000000.jpeg` (a 1600x900px image containing 100 small 160x90px frames).
- **The Benefit:** One single HTTP request loads all previews for the entire video instantly.

### 2. Transcoder Configuration (Cloud Function)
The Cloud Function instructs the Google Transcoder API to generate this grid using the following block in the job configuration:

```python
"sprite_sheets": [
    {
        "file_prefix": "preview",
        "sprite_width_pixels": 160,
        "sprite_height_pixels": 90,
        "column_count": 10,
        "row_count": 10,
        "total_count": 100
    }
]
```

### 3. Frontend Logic (Coordinate Math)
When the user moves their mouse over the video, the JavaScript calculates exactly which part of the sprite sheet to show using the following logic:

1. **Calculate Percentage:** `percent = mouseX / playerWidth`
2. **Find Sprite Index:** `index = Math.floor(percent * 100)` (0 to 99)
3. **Determine Grid Position:**
   - `col = index % 10`
   - `row = Math.floor(index / 10)`
4. **Shift Background:** We use CSS `background-position` to "slide" the large sprite sheet inside the small preview window:
   - `background-position = -col * 160px, -row * 90px`

### 4. Implementation Details
- **CSS Clipping:** The preview box has fixed dimensions (160x90) and `overflow: hidden`.
- **Pre-loading:** The `app.js` script pre-loads the image using `new Image()` and only enables the hover feature if the image successfully loads (ensuring backward compatibility for old videos).
- **Global Delivery:** Served via **Cloud CDN** to ensure that as you scrub the video, the thumbnails appear with zero latency.

---
*Created as part of the System Design Practical Projects.*
