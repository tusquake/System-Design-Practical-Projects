# Application Flow: User Journey & Logic

This document details the end-to-end operational flow of the Real-Time Traffic Simulation application.

## 🔄 Complete Application Cycle

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Spring Boot
    participant REDIS as Redis
    participant SIM as Simulator
    participant OSRM as OSRM Engine

    Note over U, SIM: 1. System Initialization
    SIM->>REDIS: Initialize Road Graph
    BE->>REDIS: Connect & Listen
    FE->>BE: Establish WebSocket (STOMP)

    Note over U, SIM: 2. Real-Time Streaming
    loop Every 1 Second
        SIM->>REDIS: Publish Traffic State
        REDIS->>BE: Forward Message
        BE->>FE: Broadcast to /topic/traffic
        FE->>FE: Update Map Polyline Colors
    end

    Note over U, SIM: 3. User Interaction (Routing)
    U->>FE: Enter Destination
    FE->>OSRM: Request Route (Steps=True)
    OSRM-->>FE: Return JSON (Coords & Steps)
    FE->>FE: Draw Primary & Alternative Routes
    FE->>FE: Generate Turn-by-Turn Text
    U->>FE: Click Voice Button
    FE->>U: Read Instructions (Web Speech API)

    Note over U, SIM: 4. Incident Reporting
    SIM->>REDIS: Publish Incident (Accident)
    REDIS->>BE: Forward Message
    BE->>FE: Broadcast to /topic/incidents
    FE->>U: Show Toast & Pulsing Marker
```

## 🧠 Logic & Algorithms

### 1. Congestion Weighting (Simulator)
The simulator applies a multiplier to road weights based on the system clock:
- **08:00 - 10:00 (Morning Rush)**: 2.5x Weight
- **17:00 - 19:00 (Evening Rush)**: 3.0x Weight
- **22:00 - 05:00 (Night)**: 0.5x Weight

### 2. Route Instruction Generation (Frontend)
Since OSRM raw data lacks human-friendly sentences, the frontend uses a mapping logic:
- `type: turn` + `modifier: left` + `name: ABC St` => **"Turn left onto ABC St"**
- If `name` is missing, it defaults to **"the road"** for better natural language flow.

### 3. Traffic Stats Aggregation
The Backend `/api/traffic/stats` endpoint:
1. Scans all active road states in Redis.
2. Calculates the average congestion percentage across the city.
3. The Frontend polls this and pushes the value into a rolling array to draw the **SVG Sparkline**.

## 🛠 Features Flow

### 📍 Geolocation & History
1. **Use My Location**: Browser API -> Nominatim Reverse Geocoding -> Populate Origin.
2. **Search History**: Successful route fetch -> Save to `localStorage` -> Display in Autocomplete suggestions.

### 🌗 Theme Management
1. **Toggle Click**: Switch CSS variables (Dark/Light colors).
2. **Map Swap**: Update Leaflet TileLayer URL (CartoDB DarkMatter vs Voyager).
