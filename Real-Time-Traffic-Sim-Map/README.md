# Real-Time Traffic Simulation & Monitoring Platform

A high-performance, professional-grade traffic visualization and routing system for the Howrah region. This platform simulates real-world traffic patterns, generates live incidents, and provides turn-by-turn navigation with real-time congestion analytics.

## 🚀 Key Features

- **Real-Time Traffic Heatmap**: Live visualization of congestion levels across Howrah's road network using Leaflet.js.
- **Dynamic Routing**: Professional-grade routing via OSRM with multiple alternatives and traffic-aware ETAs.
- **Voice Guidance**: Narrated turn-by-turn directions using the Web Speech API.
- **Incident Management**: Real-time broadcasting of accidents and roadworks with pulsing map markers and notifications.
- **Congestion Analytics**: City-wide congestion dashboard with a historical rolling sparkline trend.
- **Simulation Controls**: Dynamic simulation speed (up to 5x) and automated rush-hour traffic cycles.
- **User Experience**: Fuzzy location search, search history (LocalStorage), "Use My Location" (GPS), and Dark/Light theme toggle.

## 🛠 Tech Stack

- **Frontend**: Vite, Vanilla JavaScript, Leaflet.js, STOMP/SockJS.
- **Backend**: Spring Boot, WebSocket (STOMP), Redis.
- **Simulator**: Python (Advanced Traffic Modeling), Redis Pub/Sub.
- **Infrastructure**: Docker & Docker Compose.

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (for local frontend development)

### One-Command Setup
Start the entire infrastructure (Redis, Backend, Simulator):
```bash
docker-compose up -d --build
```

### Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔧 Troubleshooting & Known Fixes

### 1. "Undefined" Directions
**Issue**: OSRM sometimes returns steps without human-readable instructions.
**Fix**: Implemented a custom instruction generator in `main.js` that constructs sentences like *"Turn left onto Strand Road"* using `maneuver.type`, `maneuver.modifier`, and `step.name`.

### 2. Silent Voice Synthesis
**Issue**: Web Speech API can get stuck or muted due to browser garbage collection or engine pauses.
**Fixes**:
- **Global Reference**: Stored the `SpeechSynthesisUtterance` in a global variable to prevent the browser from killing it during playback.
- **Force Resume**: Added a `speechSynthesis.resume()` call to "wake up" the engine in Chrome/Windows environments.
- **Diagnostic Logging**: Added `onboundary` logging to track word-by-word progress in the console.

### 3. Simulator Connectivity
**Issue**: Simulator failing to connect to Redis inside Docker.
**Fix**: Updated `docker-compose.yml` and Python environment variables to use service names (`traffic-redis`) instead of `localhost`.
