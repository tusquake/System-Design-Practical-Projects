import asyncio
import json
import logging
import os
from typing import List, Set

import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import engine, Base, get_db
from models import BallEvent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CricStream Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)
CHANNEL_NAME = "cricket_updates"

class BallUpdate(BaseModel):
    match_id: str
    innings: int
    overs: float
    runs: int
    wickets: int
    total_runs: int
    total_wickets: int
    striker: dict
    non_striker: dict
    bowler: dict
    event: str
    commentary_en: str
    commentary_hi: str

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"New client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        if not self.active_connections:
            return
        
        logger.info(f"Broadcasting message to {len(self.active_connections)} clients")
        # Use asyncio.gather for concurrent sending
        tasks = [connection.send_text(message) for connection in self.active_connections]
        await asyncio.gather(*tasks, return_exceptions=True)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start Redis listener in the background
    asyncio.create_task(redis_listener())

async def redis_listener():
    """Listens to Redis Pub/Sub and broadcasts to all WebSocket clients."""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(CHANNEL_NAME)
    logger.info(f"Subscribed to Redis channel: {CHANNEL_NAME}")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"]
                await manager.broadcast(data)
    except Exception as e:
        logger.error(f"Error in redis_listener: {e}")
    finally:
        await pubsub.unsubscribe(CHANNEL_NAME)

@app.post("/ball-update")
async def ball_update(update: BallUpdate, db: AsyncSession = Depends(get_db)):
    """Receives ball updates from the simulator, saves to DB, and publishes to Redis."""
    
    # Save to database
    db_event = BallEvent(
        match_id=update.match_id,
        innings=update.innings,
        overs=update.overs,
        runs=update.runs,
        wickets=update.wickets,
        total_runs=update.total_runs,
        total_wickets=update.total_wickets,
        striker=update.striker,
        non_striker=update.non_striker,
        bowler=update.bowler,
        event_desc=update.event,
        commentary_en=update.commentary_en,
        commentary_hi=update.commentary_hi
    )
    db.add(db_event)
    await db.commit()

    payload = update.json()
    await redis_client.publish(CHANNEL_NAME, payload)
    return {"status": "success", "message": "Update published to Redis and DB"}

@app.get("/matches/{match_id}/history")
async def get_match_history(match_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BallEvent)
        .where(BallEvent.match_id == match_id)
        .order_by(BallEvent.timestamp.desc())
        .limit(100)
    )
    events = result.scalars().all()
    
    history = []
    for e in events:
        history.append({
            "match_id": e.match_id,
            "innings": e.innings,
            "overs": e.overs,
            "runs": e.runs,
            "wickets": e.wickets,
            "total_runs": e.total_runs,
            "total_wickets": e.total_wickets,
            "striker": e.striker,
            "non_striker": e.non_striker,
            "bowler": e.bowler,
            "event": e.event_desc,
            "commentary_en": e.commentary_en,
            "commentary_hi": e.commentary_hi
        })
    return history

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
