# AI-Powered Collaboration Platform

A backend-heavy, system design focused microservices project.

## Services
- **API Gateway**: Entry point for all requests.
- **Auth Service**: User management and JWT.
- **Chat Service**: WebSocket messaging and Kafka event production.
- **AI Service**: Semantic search (Qdrant) and text intelligence (FastAPI).
- **Scheduler Service**: Meeting management with distributed locking (Redis/Redlock).
- **Notification Service**: Event-driven notifications with retries and DLQ.

## Tech Stack
- **Languages**: Java 17 (Spring Boot), Python 3.9 (FastAPI)
- **Infrastructure**: Kafka, Redis, PostgreSQL, Qdrant
- **DevOps**: Docker, Docker Compose

## Running the project
```bash
docker-compose up --build
```
See [walkthrough.md](file:///C:/Users/tushar.seth/.gemini/antigravity/brain/a4537187-28ce-4810-a66e-308eb65914eb/walkthrough.md) for detailed testing instructions.
