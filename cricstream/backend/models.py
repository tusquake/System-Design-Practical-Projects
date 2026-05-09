from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from datetime import datetime
from database import Base

class BallEvent(Base):
    __tablename__ = "ball_events"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(String, index=True)
    innings = Column(Integer)
    overs = Column(Float)
    runs = Column(Integer)
    wickets = Column(Integer)
    total_runs = Column(Integer)
    total_wickets = Column(Integer)
    
    # Store complex nested data as JSON
    striker = Column(JSON)
    non_striker = Column(JSON)
    bowler = Column(JSON)
    
    event_desc = Column(String)
    commentary_en = Column(Text)
    commentary_hi = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
