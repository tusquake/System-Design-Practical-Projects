import time
import json
import random
from google.cloud import pubsub_v1
import os

# Configuration
PROJECT_ID = "homegenie-prod"
TOPIC_ID = "sensor-data-topic"
KEY_PATH = "../gcs-signed-url-system/homegenie-prod-97c358d8431e.json"

# Set credentials environment variable
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = KEY_PATH

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)

sensors = ["sensor-A1", "sensor-B2", "sensor-C3", "sensor-D4"]

print(f"🚀 Starting IoT Simulator for project: {PROJECT_ID}")
print(f"📡 Publishing to topic: {TOPIC_ID}")

try:
    while True:
        for sensor in sensors:
            # Generate random telemetry
            data = {
                "sensorId": sensor,
                "temperature": round(random.uniform(20.0, 35.0), 2),
                "humidity": round(random.uniform(30.0, 70.0), 2),
                "pressure": round(random.uniform(1000.0, 1020.0), 2),
                "batteryLevel": random.randint(10, 100)
            }
            
            # Convert to JSON and publish
            message_json = json.dumps(data)
            message_bytes = message_json.encode("utf-8")
            
            future = publisher.publish(topic_path, data=message_bytes)
            print(f"✅ Published {sensor}: {message_json} (ID: {future.result()})")
            
        time.sleep(10) # Wait 10 seconds between bursts
except KeyboardInterrupt:
    print("\n🛑 Simulator stopped.")
