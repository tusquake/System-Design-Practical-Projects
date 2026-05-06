import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer

app = FastAPI(title="AI Intelligence Service")

# Initialize models and client
# Using a small model for local execution speed
model = SentenceTransformer('all-MiniLM-L6-v2')
qdrant_host = os.getenv("QDRANT_HOST", "localhost")
client = QdrantClient(host=qdrant_host, port=6333)

COLLECTION_NAME = "messages"

# Initialize Qdrant collection
try:
    client.get_collection(COLLECTION_NAME)
except Exception:
    client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
    )

class TranscriptRequest(BaseModel):
    text: str

class MessageRequest(BaseModel):
    message_id: str
    content: str
    conversation_id: str

class SearchQuery(BaseModel):
    query: str
    conversation_id: Optional[str] = None

@app.post("/summarize")
async def summarize(request: TranscriptRequest):
    # Mock summarization logic (In production, call OpenAI/LLM)
    summary = f"Summary of the meeting: {request.text[:50]}..."
    return {"summary": summary}

@app.post("/extract-actions")
async def extract_actions(request: TranscriptRequest):
    # Mock action item extraction
    actions = ["Follow up with team", "Refactor API"]
    return {"actions": actions}

@app.post("/embed-text")
async def embed_text(request: MessageRequest):
    vector = model.encode(request.content).tolist()
    
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            models.PointStruct(
                id=hash(request.message_id) % (10**10), # Simple numeric ID for Qdrant
                vector=vector,
                payload={
                    "message_id": request.message_id,
                    "content": request.content,
                    "conversation_id": request.conversation_id
                }
            )
        ]
    )
    return {"status": "indexed"}

@app.post("/search")
async def search(request: SearchQuery):
    query_vector = model.encode(request.query).tolist()
    
    # Filter by conversation if provided
    search_filter = None
    if request.conversation_id:
        search_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="conversation_id",
                    match=models.MatchValue(value=request.conversation_id)
                )
            ]
        )

    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=search_filter,
        limit=5
    )
    
    return [{"content": res.payload["content"], "score": res.score} for res in results]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
