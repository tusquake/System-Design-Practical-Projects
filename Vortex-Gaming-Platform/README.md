# Vortex: Real-Time Gaming & Engagement Platform

Vortex is a showcase of advanced Redis features in a high-performance gaming context. It moves beyond simple caching to use Redis as a primary logic and coordination engine.

## 🚀 Advanced Redis Features Implemented

1. **Global Leaderboard (`ZSET`)**: 
   - Uses Redis Sorted Sets for real-time ranking.
   - O(log N) insertion and retrieval for million-user scales.
   
2. **Tournament Entry (`Redlock`)**:
   - Uses Distributed Locking via **Redisson**.
   - Prevents race conditions and "over-booking" of limited tournament slots.

3. **User Engagement Analytics (`Bitmaps`)**:
   - Tracks "Daily Active Users" (DAU) by setting individual bits for user IDs.
   - Extremely memory efficient (~125KB for 1M users).

4. **Stream Viewer Estimator (`HyperLogLog`)**:
   - Probabilistic counting for unique tournament viewers.
   - Fixed 12KB memory footprint with < 1% error.

5. **Live Event Pipeline (`Redis Streams`)**:
   - Reliable, persistent event stream for match results.
   - Decouples match simulation from reward processing.

6. **Autocomplete Search (`ZSET Lexicographical`)**:
   - High-speed prefix search for player discovery.

## 🛠️ Local Development

We use Docker for infrastructure (Redis & Postgres) and run the application services on the host for faster development.

### 1. Start Infrastructure (Docker)
Ensure you have Docker installed.
```bash
docker-compose up -d
```
- **RedisInsight GUI**: [http://localhost:8001](http://localhost:8001) (Visualize your data!)

### 2. Start Backend (Spring Boot)
Navigate to `backend/` and run:
```bash
mvn spring-boot:run
```
- **API Base**: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)

### 3. Start Frontend (Vite)
Navigate to `frontend/` and run:
```bash
npm install --legacy-peer-deps
npm run dev
```
- **Dashboard**: [http://localhost:3000](http://localhost:3000) (Default Vite port might be 5173 if not configured)

## 🧪 Quick Test (Postman/Curl)

### Initialize a Tournament
```bash
curl -X POST "http://localhost:8080/api/v1/tournaments/T1/init?slots=5"
```

### Submit a Score
```bash
curl -X POST "http://localhost:8080/api/v1/scores?playerId=Tushar&score=950"
```

### Register Player for Search
```bash
curl -X POST "http://localhost:8080/api/v1/search/players?name=Tushar"
```
