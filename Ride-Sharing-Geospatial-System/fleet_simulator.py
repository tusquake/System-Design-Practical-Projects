import requests
import random
import time
import json

# Howrah, West Bengal (User's Current Location)
CENTER_LAT = 22.601151
CENTER_LON = 88.348256
API_URL = "http://host.docker.internal:8080/api/drivers/location"

class Driver:
    def __init__(self, driver_id):
        self.driver_id = f"driver-{driver_id}"
        # Start at a random spot near the center
        self.lat = CENTER_LAT + random.uniform(-0.02, 0.02)
        self.lon = CENTER_LON + random.uniform(-0.02, 0.02)

    def move(self):
        # Simulate a small movement
        self.lat += random.uniform(-0.0005, 0.0005)
        self.lon += random.uniform(-0.0005, 0.0005)

    def report(self):
        payload = {
            "driverId": self.driver_id,
            "latitude": self.lat,
            "longitude": self.lon
        }
        try:
            response = requests.post(API_URL, json=payload)
            print(f"[{self.driver_id}] Lat: {self.lat:.4f}, Lon: {self.lon:.4f} -> {response.status_code}")
        except Exception as e:
            print(f"Error reporting for {self.driver_id}: {e}")

# Create a fleet of 50 drivers
fleet = [Driver(i) for i in range(1, 51)]

print(f"🚀 Starting Fleet Simulator (50 drivers in NYC)...")
while True:
    for driver in fleet:
        driver.move()
        driver.report()
    time.sleep(2) # Update every 2 seconds
