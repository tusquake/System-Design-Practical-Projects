# 🛰️ IoT-GCP-Cassandra-Telemetry: System Design

## 📖 Overview
This project demonstrates a scalable IoT pipeline. In a real-world scenario, millions of sensors push data simultaneously. A traditional database (RDBMS) would struggle with the write volume, and a direct connection from devices to a database would be brittle.

## 🏗️ Architectural Components

### 1. GCP Pub/Sub (The Shock Absorber)
- **Decoupling**: Devices don't need to know about the database. They just "Publish" to a topic.
- **Scalability**: Pub/Sub handles massive spikes in traffic by buffering messages until the consumer is ready.
- **Reliability**: If the backend goes down, messages stay in the subscription for up to 7 days.

### 2. Spring Boot Consumer (The Worker)
- **Asynchronous Ingestion**: Uses the Spring Cloud GCP library to listen for messages.
- **Transformation**: Converts raw JSON telemetry into optimized Cassandra entities.
- **Batching**: (Potential enhancement) In production, this would write to Cassandra in batches for even higher throughput.

### 3. Apache Cassandra (The Time-Series Sink)
Cassandra is a **Wide-Column Store** perfect for time-series because:
- **LSM-Tree Storage**: Writes are appended to a log (CommitLog) and a memory table (Memtable), making them $O(1)$.
- **Clustering Keys**: Data is stored on disk sorted by the clustering key (`recorded_at DESC`). This makes fetching the "Latest 10 readings" extremely fast as it's just a sequential disk read.

## 🧠 Data Modeling: The "Bucket" Pattern
We use a composite primary key: `PRIMARY KEY ((sensor_id, day_bucket), recorded_at)`.

1. **Partition Key**: `(sensor_id, day_bucket)`
   - If we only used `sensor_id`, one sensor's data over 10 years would create a "Massive Partition" (>100MB), which degrades Cassandra performance.
   - By adding `day_bucket` (e.g., "2024-04-28"), we split the data into manageable chunks across the cluster.
2. **Clustering Key**: `recorded_at`
   - Within each day-bucket, data is physically sorted by time.

## 🛠️ How to Run
1. **Infrastructure**: Run `docker-compose up -d`. This starts Cassandra.
2. **GCP Setup**: 
   - Ensure your JSON key is in the location specified in `application.yml`.
   - Create a Topic named `sensor-data-topic`.
   - Create a Subscription named `sensor-data-sub`.
3. **Backend**: Run `./mvnw spring-boot:run` in the `backend` folder.
4. **Test**: Publish a message to the topic:
   ```json
   {
     "sensorId": "sensor-123",
     "temperature": 25.5,
     "humidity": 60,
     "pressure": 1013,
     "batteryLevel": 85
   }
   ```
