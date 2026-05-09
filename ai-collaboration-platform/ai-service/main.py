import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from fastembed import TextEmbedding

app = FastAPI(title="AI Intelligence Service", version="1.0.0")

# ---------------------------------------------------------------------------
# Startup: initialize embedding model and Qdrant collection
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
VECTOR_SIZE = 384
COLLECTION_NAME = "messages"

embedder = TextEmbedding(EMBEDDING_MODEL)

qdrant_host = os.getenv("QDRANT_HOST", "localhost")
client = QdrantClient(host=qdrant_host, port=6333)

# Ensure the collection exists
existing = [c.name for c in client.get_collections().collections]
if COLLECTION_NAME not in existing:
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
    )

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class TranscriptRequest(BaseModel):
    text: str

class MessageRequest(BaseModel):
    message_id: str
    content: str
    conversation_id: str

class SearchQuery(BaseModel):
    query: str
    conversation_id: Optional[str] = None

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "model": EMBEDDING_MODEL}


@app.post("/summarize")
def summarize(request: TranscriptRequest):
    """
    Accepts a meeting transcript and returns a mock summary.
    In production: replace with an OpenAI / LLM call.
    """
    sentences = request.text.split(".")
    key_sentences = [s.strip() for s in sentences if len(s.strip()) > 20][:3]
    summary = " ".join(key_sentences) if key_sentences else request.text[:200]
    return {
        "summary": summary,
        "word_count": len(request.text.split()),
        "note": "Mock summary — plug in OpenAI API for production"
    }


@app.post("/extract-actions")
def extract_actions(request: TranscriptRequest):
    """
    Extracts action items from a transcript.
    Mock implementation — replace with LLM chain in production.
    """
    action_keywords = ["will", "should", "need to", "must", "action:", "todo:"]
    actions = []
    for sentence in request.text.split("."):
        s = sentence.strip().lower()
        if any(kw in s for kw in action_keywords):
            actions.append(sentence.strip())

    if not actions:
        actions = ["Follow up on discussed items", "Share meeting notes with the team"]

    return {"actions": actions, "count": len(actions)}


@app.post("/embed-text")
def embed_text(request: MessageRequest):
    """
    Embeds a message and stores it in Qdrant for semantic search.
    Uses fastembed (ONNX-based all-MiniLM-L6-v2, ~60MB).
    """
    vectors = list(embedder.embed([request.content]))
    vector = vectors[0].tolist()

    # Use a stable numeric ID derived from the message_id string
    point_id = abs(hash(request.message_id)) % (2**63)

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "message_id": request.message_id,
                    "content": request.content,
                    "conversation_id": request.conversation_id,
                }
            )
        ]
    )
    return {"status": "indexed", "message_id": request.message_id}


@app.post("/search")
def search(request: SearchQuery):
    """
    Semantic search over stored messages using cosine similarity.
    Optionally scoped to a specific conversation.
    """
    query_vectors = list(embedder.embed([request.query]))
    query_vector = query_vectors[0].tolist()

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

    return [
        {
            "content": r.payload["content"],
            "score": round(r.score, 4),
            "conversation_id": r.payload.get("conversation_id")
        }
        for r in results
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
