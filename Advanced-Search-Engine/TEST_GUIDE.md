# Advanced Search System: Test Guide

Follow these steps to verify the production-grade search features.

## 1. Setup (Ingestion)
Add the following items via the UI:
- **Product A:** `iPhone 15 Pro`, Category: `Electronics`, Lat: `12.97`, Lon: `77.59`
- **Product B:** `Titanium Watch`, Category: `Accessories`, Lat: `12.97`, Lon: `77.59`
- **Product C:** `Mumbai Spice Box`, Category: `Food`, Lat: `19.07`, Lon: `72.87`

## 2. Intelligence Tests

### Autocomplete ⌨️
- **Test:** Type `iph` slowly.
- **Success:** Dropdown shows "iPhone 15 Pro".

### Fuzzy Matching 🪲
- **Mode:** Fuzzy
- **Test:** Search `iphne` (typo).
- **Success:** System finds "iPhone 15 Pro".

### Highlighting 🔦
- **Test:** Search `Titanium`.
- **Success:** The word "Titanium" is highlighted in yellow on the result card.

### Faceted Search 🏷️
- **Test:** Check the Sidebar.
- **Success:** Shows category counts: Electronics (1), Accessories (1), Food (1).

### Geo-Spatial Search 📍
- **Action:** Click "Near Me".
- **Success:** "Mumbai Spice Box" disappears (too far); Bengaluru products remain.

### Field Boosting ⚖️
- **Test:** Search a term present in both name and description.
- **Success:** Matches in the "Name" field appear first in results.
