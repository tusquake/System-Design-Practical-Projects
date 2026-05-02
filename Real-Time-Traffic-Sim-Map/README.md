# Real-Time Traffic Simulation & Monitoring Platform

A high-performance, professional-grade traffic visualization and routing system for the Howrah region. This platform simulates real-world traffic patterns, generates live incidents, and provides turn-by-turn navigation with real-time congestion analytics.

---

## 🚀 Key Features

- **Real-Time Traffic Heatmap**: Live visualization of congestion levels across Howrah's road network using Leaflet.js.
- **Dynamic Routing**: Professional-grade routing via OSRM with multiple alternatives and traffic-aware ETAs.
- **Voice Guidance**: Narrated turn-by-turn directions using the Web Speech API with advanced state management.
- **Incident Management**: Real-time broadcasting of accidents and roadworks with pulsing map markers and notifications.
- **Congestion Analytics**: City-wide congestion dashboard with a historical rolling sparkline trend.
- **Professional UI**: Modern design using **Lucide Icons**, glassmorphism panels, and dynamic light/dark mode.
- **Simulation Controls**: Dynamic simulation speed (up to 5x) and automated rush-hour traffic cycles.
- **Advanced UX**: Fuzzy location search, search history, "Use My Location" (GPS), and animated route transitions.

## 🛠 Tech Stack

- **Frontend**: Vite, Vanilla JavaScript, Leaflet.js, Lucide Icons, STOMP/SockJS.
- **Backend**: Spring Boot, WebSocket (STOMP), Redis.
- **Simulator**: Python (Advanced Traffic Modeling), Redis Pub/Sub.
- **Infrastructure**: Docker & Docker Compose.

---

## 📂 Project Structure

```text
.
├── backend/            # Spring Boot application (WebSocket & Redis Bridge)
├── frontend/           # Vite + Vanilla JS (Leaflet UI & Routing)
├── simulator/          # Python Simulator (Traffic Logic & Incident Engine)
├── docker-compose.yml  # Infrastructure orchestration
├── SYSTEM_DESIGN.md    # High-level architecture & Mermaid diagrams
└── APPLICATION_FLOW.md # Sequence diagrams & user journey details
```

## 🚦 Getting Started

### 1. Start Infrastructure
Run the entire backend ecosystem (Redis, Java Backend, Python Simulator) using Docker:
```bash
docker-compose up -d --build
```

### 2. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔧 Troubleshooting & Key Fixes

### 🔊 Silent Voice Guidance
If the voice features are not audible, check the browser console. We have implemented:
- **Global GC Protection**: Prevents the browser from garbage collecting the utterance during playback.
- **Force Resume**: A watchdog timer that resumes the speech engine if the browser auto-pauses it.
- **Voice Cache**: Pre-loads system voices to avoid the "empty voice list" race condition in Chromium.

### 📍 Direction Labels
OSRM often returns empty road names. The app includes a **Human-Readable Instruction Generator** that constructs natural sentences (e.g., *"Turn left onto the road"*) even when street data is missing.

### 🐳 Docker Networking
All services communicate via internal Docker hostnames (`traffic-redis`, `traffic-backend`). Ensure you are using the provided `docker-compose.yml` for unified connectivity.

---

## 📖 Extended Documentation
- [System Design & Architecture](./SYSTEM_DESIGN.md)
- [End-to-End Application Flow](./APPLICATION_FLOW.md)
