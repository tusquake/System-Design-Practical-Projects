import os
import time
import json
import random
import requests
import redis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
SIMULATION_AREA = os.getenv('SIMULATION_AREA', 'Howrah')

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def fetch_roads(area_name):
    # Get bounding box for the area
    logger.info(f"Fetching bounding box for {area_name}...")
    nom_url = f"https://nominatim.openstreetmap.org/search?q={area_name}&format=json"
    headers = {'User-Agent': 'TrafficSim/1.0'}
    res = requests.get(nom_url, headers=headers).json()
    
    if not res:
        logger.error("Could not find area.")
        return None
        
    bbox = res[0]['boundingbox']
    # bbox from Nominatim is [latMin, latMax, lonMin, lonMax]
    # Overpass expects [latMin, lonMin, latMax, lonMax]
    overpass_bbox = f"{bbox[0]},{bbox[2]},{bbox[1]},{bbox[3]}"
    
    # Simplify query
    overpass_query = f'[out:json];way({overpass_bbox})["highway"];out body geom;'
    
    logger.info(f"Fetching roads using Overpass for bbox {overpass_bbox}...")
    # FIX 1: Remove the 'Accept: application/json' header — Overpass serves its own
    #         format and rejects requests that demand JSON via the Accept header (406).
    # FIX 2: Use POST with the query in the request body instead of a GET query param.
    #         Overpass reliably accepts POST requests; large queries can also silently
    #         fail or be rejected when sent as GET params.
    headers = {'User-Agent': 'TrafficSim/1.0'}
    op_res = requests.post(
        "https://overpass-api.de/api/interpreter",
        data=overpass_query,
        headers=headers,
    )
    
    roads = []
    if op_res.status_code == 200:
        data = op_res.json()
        for element in data.get('elements', []):
            if element['type'] == 'way' and 'geometry' in element:
                coords = [[node['lat'], node['lon']] for node in element['geometry']]
                highway_type = element.get('tags', {}).get('highway', 'unknown')
                name = element.get('tags', {}).get('name', 'Unknown Road')
                roads.append({
                    'id': element['id'],
                    'name': name,
                    'type': highway_type,
                    'coords': coords,
                    'congestion': 'low' # initial state
                })
        logger.info(f"Found {len(roads)} roads.")
        return roads
    else:
        logger.error(f"Overpass API error: {op_res.status_code}")
        return None

def get_congestion_weights():
    hour = time.localtime().tm_hour
    # Morning rush: 8-10 AM
    if 8 <= hour <= 10:
        return [0.2, 0.3, 0.5] # 50% High
    # Evening rush: 5-7 PM
    elif 17 <= hour <= 19:
        return [0.2, 0.3, 0.5] # 50% High
    # Afternoon: 12-2 PM
    elif 12 <= hour <= 14:
        return [0.4, 0.4, 0.2] # 20% High
    # Night: 11 PM - 6 AM
    elif hour >= 23 or hour <= 6:
        return [0.9, 0.08, 0.02] # Very Low
    else:
        return [0.6, 0.3, 0.1] # Normal

def get_sim_speed():
    try:
        speed = redis_client.get('sim_speed')
        if speed:
            return float(speed)
    except:
        pass
    return float(os.getenv('SIMULATION_SPEED', 1.0))

def generate_incidents(roads):
    # Small chance to generate an incident on a major road
    if random.random() < 0.02: # 2% chance per tick
        major_roads = [r for r in roads if r['type'] in ['motorway', 'trunk', 'primary', 'secondary']]
        if not major_roads: major_roads = roads
        
        road = random.choice(major_roads)
        incident = {
            'id': f"inc_{int(time.time())}_{road['id']}",
            'roadId': road['id'],
            'name': road['name'],
            'lat': road['coords'][0][0],
            'lon': road['coords'][0][1],
            'type': random.choice(['Accident', 'Breakdown', 'Roadworks', 'Flood']),
            'severity': random.choice(['moderate', 'severe']),
            'timestamp': time.time()
        }
        message = json.dumps({'type': 'incident', 'data': [incident]})
        redis_client.publish('incident_channel', message)
        logger.info(f"Published incident: {incident['type']} on {incident['name']}")

def simulate_traffic(roads):
    levels = ['low', 'medium', 'high']
    
    while True:
        weights = get_congestion_weights()
        speed = get_sim_speed()
        
        generate_incidents(roads)
        
        updates = []
        for road in roads:
            # Randomly change congestion, but with some stickiness
            if random.random() < 0.2: # 20% chance to change state per tick
                new_level = random.choices(levels, weights=weights)[0]
                if road['congestion'] != new_level:
                    road['congestion'] = new_level
                    updates.append({
                        'id': road['id'],
                        'congestion': road['congestion']
                    })
        
        if updates:
            # Publish to Redis
            message = json.dumps({'type': 'traffic_update', 'data': updates})
            redis_client.publish('traffic_channel', message)
            
            # Also update the full state in Redis so new clients get latest state
            # This is not perfectly thread-safe if multiple simulators exist, but fine for our demo
            for road in roads:
                for update in updates:
                    if road['id'] == update['id']:
                        road['congestion'] = update['congestion']
            
            redis_client.set('traffic_full_state', json.dumps({'type': 'initial_state', 'data': roads}))
            logger.info(f"Published updates for {len(updates)} roads (Speed: {speed}x)")
            
        time.sleep(max(0.5, 3.0 / speed))

if __name__ == "__main__":
    logger.info("Starting Traffic Simulator...")
    # Wait for redis
    for _ in range(10):
        try:
            redis_client.ping()
            logger.info("Connected to Redis.")
            break
        except redis.ConnectionError:
            logger.info("Waiting for Redis...")
            time.sleep(2)
            
    roads = fetch_roads(SIMULATION_AREA)
    if roads:
        # Publish initial full state
        initial_state = json.dumps({'type': 'initial_state', 'data': roads})
        redis_client.set('traffic_full_state', initial_state)
        
        simulate_traffic(roads)