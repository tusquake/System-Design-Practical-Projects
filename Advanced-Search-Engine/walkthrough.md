# Advanced Search Engine Walkthrough

We have built a production-grade search intelligence system. Below is the summary of the features and the technical implementation.

## 🌟 Implemented Features

### 1. Autocomplete (Prefix Suggester)
- **Logic:** Uses the Elasticsearch `completion` field type.
- **Implementation:** When a product is saved, the `suggest` field is automatically populated with the product name.
- **UI:** A debounced dropdown appears as you type, allowing users to pick terms instantly.

### 2. Typo-Tolerant (Fuzzy) Search
- **Logic:** Uses Levenshtein distance (Fuzziness: AUTO).
- **Benefit:** If a user types "iphne," the system still finds "iPhone."

### 3. Result Highlighting
- **Logic:** Requests `highlight` fragments from the ES Query DSL.
- **UI:** Matching terms are wrapped in `<em>` tags and styled with a yellow background for visual feedback.

### 4. Faceted Search (Aggregations)
- **Logic:** Uses Elasticsearch `terms` aggregations on the `category` field.
- **UI:** A sidebar displays all available categories and the count of products in each, updating in real-time with your search.

### 5. Field Boosting
- **Logic:** The query uses `name^3`, giving three times more weight to matches in the title vs the description.
- **Benefit:** Ensures that if someone searches for "MacBook," actual MacBooks appear at the top, even if the word appears in other descriptions.

### 6. Geo-Spatial Search
- **Logic:** Uses `geo_distance` filter on a `geo_point` field.
- **UI:** A "Near Me" feature that simulates a user in Bengaluru and filters for products within a 10km radius.

---

## 🛠️ Technical Stack
- **Engine:** Elasticsearch 8.11
- **Backend:** Spring Boot 3.2 (Spring Data Elasticsearch)
- **Frontend:** Vanilla JS, CSS (Glassmorphism), HTML5
- **Orchestration:** Docker Compose

---
## 🧪 Verification Results
- [x] Inverted Indexing functional
- [x] Fuzzy matching verified
- [x] Aggregations (Facets) rendering counts correctly
- [x] Boosting prioritizing name matches
- [x] Geo-distance filtering correctly excluding distant products
