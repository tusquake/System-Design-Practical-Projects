# 🔔 Global Notification Engine

> A production-grade, distributed notification system that delivers messages across Email, SMS, and Push — reliably, at scale, and on schedule.

---

## 📖 What Is This?

Imagine you run a large bank. Every time a transaction happens, you need to:

- **Email** the user a receipt
- **SMS** them a fraud alert
- **Push notify** their app in real time

The naive way? Call each service one by one, sequentially. If the SMS provider is down, the email never sends. If your server crashes mid-way, the user gets nothing.

**This project solves exactly that.** It decouples notification delivery from your core application using a battle-tested Pub/Sub architecture — so every channel works independently, failures are handled gracefully, and you can even schedule notifications for the future.

---

## 🏗️ Architecture — The "Radio Broadcast" Mental Model

Think of this system like a **radio station**:

| Real World | This System |
|---|---|
| Radio Station | Spring Boot API Gateway |
| Broadcast Signal | Google Cloud Pub/Sub Topic |
| FM Radio | Email Worker (Cloud Function) |
| AM Radio | SMS Worker (Cloud Function) |
| Satellite Radio | Push Worker (Cloud Function) |
| Failed signal → archive | Dead Letter Queue (DLQ) |
| Scheduled broadcast | Google Cloud Tasks |

The station (Gateway) **broadcasts once**. Every radio (worker) that's tuned in receives the signal independently. If your FM radio breaks, it doesn't affect AM — and the broadcast isn't lost, it just retries until FM is back online.

```
Client App
    │
    ▼
┌─────────────────────────────┐
│   Spring Boot API Gateway   │  ← Single entry point for all notifications
└────────────┬────────────────┘
             │ Publishes ONE message
             ▼
┌─────────────────────────────┐
│   Google Cloud Pub/Sub      │  ← The "broadcast tower"
│   global-notification-topic │
└──────┬──────────┬───────────┘
       │          │           │
       ▼          ▼           ▼
  [Email Sub] [SMS Sub]  [Push Sub]   ← Independent listeners
       │          │           │
       ▼          ▼           ▼
  Email Fn    SMS Fn      Push Fn     ← Serverless workers
       │          │           │
       ▼          ▼           ▼
  SendGrid   Twilio         FCM       ← Third-party delivery

       │ (on 5 failures)
       ▼
  ┌──────────┐
  │   DLQ    │  ← Dead Letter Queue for manual review
  └──────────┘
```

---

## 💎 Core Design Decisions (And Why They Matter)

### 1. Pub/Sub Fan-out — "Shout Once, Everyone Hears"

**The problem it solves:** Without this, your gateway would call Email API → wait → SMS API → wait → Push API → wait. That's slow, and if any one fails, you have to handle the retry logic yourself.

**How it works:** The Gateway publishes a single JSON message to a Pub/Sub topic. Pub/Sub automatically "fans out" a copy of that message to every subscribed channel worker simultaneously.

**Real-world benefit:** Adding a new channel (say, WhatsApp) requires zero changes to the Gateway. Just add a new subscription and a new worker. Done.

---

### 2. Message Durability & Exponential Backoff — "The Post Office Guarantee"

**The analogy:** When you mail a package, the post office doesn't give up if no one's home. They try again tomorrow, then the day after. That's what this system does.

**How it works:** If the Email Cloud Function crashes or SendGrid returns a 429 (rate limit), Pub/Sub holds the message and retries with **Exponential Backoff**:
- Retry 1: Wait 10 seconds
- Retry 2: Wait 20 seconds
- Retry 3: Wait 40 seconds… and so on.

This prevents hammering a struggling service and gives it time to recover.

---

### 3. Dead Letter Queue (DLQ) — "The Returns Department"

**The analogy:** After 5 failed delivery attempts, the post office sends the package to a "returns department" for a human to inspect — not just discard it.

**How it works:** After 5 consecutive failures (e.g., permanently invalid email, expired API key), the message is moved off the main queue and into a **`global-failure-topic`**. An admin is alerted for manual review.

This prevents infinite retry loops, protects your worker compute budget, and ensures no notification is silently lost.

---

### 4. Delayed Execution via Cloud Tasks — "The Alarm Clock"

**The analogy:** You set an alarm for 7 AM. You don't stay awake all night waiting — the alarm wakes you up exactly when needed.

**How it works:** When a client requests a notification with `?delaySeconds=3600`, the Gateway creates a task in **Google Cloud Tasks** with a future timestamp. Cloud Tasks holds it and calls back the Gateway API at precisely the right moment — no polling, no cron jobs, no wasted resources.

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| API Gateway | Java 21 + Spring Boot 3.2 | Robust, production-ready REST layer |
| Message Broker | Google Cloud Pub/Sub | Managed, scalable, durable message queue |
| Workers | Python 3.10 Cloud Functions (Gen 2) | Serverless, scales to zero, cost-efficient |
| Scheduler | Google Cloud Tasks | Reliable distributed task scheduling |
| Email | SendGrid | Industry-standard transactional email |
| SMS | Twilio | Global SMS delivery with delivery receipts |
| Push | Firebase Cloud Messaging (FCM) | Cross-platform mobile/web push |

---

## 📂 Project Structure

```
Distributed-Notification-Service/
│
├── notification-gateway/          # Spring Boot API Gateway
│   ├── src/
│   │   └── main/java/
│   │       ├── controller/
│   │       │   └── NotificationController.java   # POST /v1/notify
│   │       ├── service/
│   │       │   ├── PubSubPublisherService.java    # Publishes to topic
│   │       │   └── CloudTasksService.java         # Schedules delayed tasks
│   │       └── model/
│   │           └── NotificationRequest.java       # Request payload POJO
│   └── pom.xml
│
├── cloud-functions/               # Serverless Channel Workers (Python)
│   ├── email-worker/
│   │   ├── main.py                # SendGrid integration
│   │   └── requirements.txt
│   ├── sms-worker/
│   │   ├── main.py                # Twilio integration
│   │   └── requirements.txt
│   └── push-worker/               # ⏳ In Progress
│       ├── main.py                # FCM integration
│       └── requirements.txt
│
└── infrastructure/                # Optional: IaC scripts
    ├── terraform/
    │   ├── pubsub.tf              # Topic & Subscription definitions
    │   └── iam.tf                 # Service Account permissions
    └── setup.sh                   # Quick-start provisioning script
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Java JDK | 21+ | Run Spring Boot Gateway |
| Maven | 3.8+ | Build the Gateway |
| Python | 3.10+ | Run/test Cloud Functions locally |
| Google Cloud SDK | Latest | Deploy functions & manage Pub/Sub |
| ngrok | Latest | Tunnel Cloud Task callbacks to localhost |

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/Distributed-Notification-Service.git
cd Distributed-Notification-Service
```

### Step 2: Configure Environment Variables

Create a `.env` file or export these in your shell:

```bash
# Google Cloud
export GCP_PROJECT_ID="your-gcp-project-id"
export PUBSUB_TOPIC="global-notification-topic"
export FAILURE_TOPIC="global-failure-topic"
export CLOUD_TASKS_QUEUE="notification-scheduler-queue"
export CLOUD_TASKS_LOCATION="us-central1"

# SendGrid (Email)
export SENDGRID_API_KEY="SG.xxxxxxxxxxxx"
export SENDGRID_FROM_EMAIL="alerts@yourdomain.com"

# Twilio (SMS)
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="your_auth_token"
export TWILIO_FROM_NUMBER="+1xxxxxxxxxx"

# FCM (Push) - Path to your service account JSON
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
```

### Step 3: Provision Cloud Infrastructure

```bash
# Create Pub/Sub topic and subscriptions
gcloud pubsub topics create global-notification-topic
gcloud pubsub topics create global-failure-topic

# Create subscriptions with Dead Letter Queue
gcloud pubsub subscriptions create email-sub \
  --topic=global-notification-topic \
  --dead-letter-topic=global-failure-topic \
  --max-delivery-attempts=5 \
  --ack-deadline=60

gcloud pubsub subscriptions create sms-sub \
  --topic=global-notification-topic \
  --dead-letter-topic=global-failure-topic \
  --max-delivery-attempts=5 \
  --ack-deadline=60

# Create Cloud Tasks queue
gcloud tasks queues create notification-scheduler-queue \
  --location=us-central1
```

### Step 4: Deploy Cloud Functions

```bash
# Deploy Email Worker
cd cloud-functions/email-worker
gcloud functions deploy email-worker \
  --gen2 \
  --runtime=python310 \
  --trigger-topic=global-notification-topic \
  --region=us-central1 \
  --set-env-vars SENDGRID_API_KEY=$SENDGRID_API_KEY,FROM_EMAIL=$SENDGRID_FROM_EMAIL

# Deploy SMS Worker
cd ../sms-worker
gcloud functions deploy sms-worker \
  --gen2 \
  --runtime=python310 \
  --trigger-topic=global-notification-topic \
  --region=us-central1 \
  --set-env-vars TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN,FROM_NUMBER=$TWILIO_FROM_NUMBER
```

### Step 5: Run the API Gateway

```bash
cd notification-gateway
mvn spring-boot:run
```

The gateway starts on `http://localhost:8080`.

---

## 🧪 Testing the System

### Send an Instant Notification

```bash
curl -X POST http://localhost:8080/v1/notify \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "user@example.com",
    "content": "Your OTP is 482910. Valid for 5 minutes.",
    "subject": "Login Alert"
  }'
```

**Expected:** HTTP 202 Accepted. Within seconds, check your SendGrid and Twilio dashboards for delivery confirmation.

---

### Schedule a Notification (60-Second Delay)

First, start ngrok to expose your local gateway for Cloud Task callbacks:

```bash
ngrok http 8080
# Copy the https forwarding URL, e.g. https://abc123.ngrok.io
```

Then schedule the notification:

```bash
curl -X POST "http://localhost:8080/v1/notify/schedule?delaySeconds=60" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "user@example.com",
    "content": "Your free trial expires in 1 hour. Upgrade now!",
    "subject": "Subscription Reminder"
  }'
```

**Expected:** HTTP 202 Accepted immediately. Exactly 60 seconds later, the notification is delivered.

---

### Simulating a DLQ Failure

To test Dead Letter Queue behavior, temporarily set an invalid SendGrid key in your function's environment variables and send a notification. After 5 retry attempts, check the `global-failure-topic` for the failed message:

```bash
gcloud pubsub subscriptions pull global-failure-topic-sub --auto-ack --limit=5
```

---

## 📊 Request & Response Reference

### `POST /v1/notify` — Instant Notification

**Request Body:**

```json
{
  "recipient": "user@example.com",
  "content": "Your order #12345 has been shipped.",
  "subject": "Order Update"
}
```

**Response:**

```json
{
  "status": "ACCEPTED",
  "messageId": "pub-sub-message-id-abc123",
  "timestamp": "2025-07-15T10:30:00Z"
}
```

---

### `POST /v1/notify/schedule?delaySeconds={n}` — Scheduled Notification

**Query Param:** `delaySeconds` — integer, number of seconds from now to deliver.

**Request Body:** Same as above.

**Response:**

```json
{
  "status": "SCHEDULED",
  "taskName": "projects/my-project/locations/us-central1/queues/notification-scheduler-queue/tasks/task-id",
  "scheduledFor": "2025-07-15T11:30:00Z"
}
```

---

## 🛰️ Roadmap

### ✅ Done
- Pub/Sub topic & subscription setup with DLQ
- Spring Boot Gateway with PubSubTemplate integration
- Email Worker (SendGrid)
- SMS Worker (Twilio)
- Cloud Tasks scheduling with ngrok local testing

### ⏳ In Progress
- **Push Notification Worker (FCM)** — The third channel for mobile/web push delivery

### 🔮 Planned

#### Intelligent Routing & User Preferences
Add a Redis-backed preferences layer to the Gateway. Before broadcasting, check if a user has opted out of SMS or prefers email-only. Route accordingly rather than blindly fan-out to all channels.

```
User Preferences DB / Redis
        │
        ▼
Gateway → [check prefs] → publish only to opted-in channels
```

#### Idempotency & Deduplication
Implement an `idempotency-key` header check backed by Redis. If the same key is received twice (common during network retries), the second request is silently dropped — ensuring the user receives exactly one notification, not two.

```bash
curl -X POST http://localhost:8080/v1/notify \
  -H "Idempotency-Key: order-shipped-12345-v1" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

#### Monitoring & Observability
Set up Google Cloud Monitoring dashboards tracking:
- Delivery success rate per channel
- End-to-end latency (API receive → third-party delivery)
- DLQ message volume (leading indicator of API key / quota issues)
- Cloud Function cold start frequency

---

## ❓ Common Issues & Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| 403 on Pub/Sub publish | Missing IAM role on service account | Grant `roles/pubsub.publisher` to the Gateway's service account |
| Cloud Function not triggered | Subscription not linked to function | Verify function trigger is set to the correct topic |
| Messages going to DLQ immediately | ack-deadline too short | Increase `--ack-deadline` to 120s or higher |
| ngrok callback failing | ngrok URL changed on restart | Restart Cloud Tasks with updated ngrok URL |
| Twilio 400 error | Invalid `from` number for region | Use a Twilio number purchased for the recipient's country |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/whatsapp-worker`
3. Commit with a clear message: `git commit -m "feat: add WhatsApp notification channel"`
4. Push and open a Pull Request

Please ensure all new Cloud Functions include unit tests and environment variable documentation.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> Built to handle scale, designed to fail gracefully. Every notification matters.