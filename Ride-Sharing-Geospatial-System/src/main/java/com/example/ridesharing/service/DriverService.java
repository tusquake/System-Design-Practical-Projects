package com.example.ridesharing.service;

import com.example.ridesharing.model.DriverLocation;
import lombok.RequiredArgsConstructor;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final RedisTemplate<String, String> redisTemplate;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private static final String DRIVER_GEO_KEY = "drivers:locations";

    public void updateLocation(DriverLocation location) {
        // 1. Update Geospatial Index in Redis
        redisTemplate.opsForGeo().add(
            DRIVER_GEO_KEY, 
            new org.springframework.data.geo.Point(location.getLongitude(), location.getLatitude()), 
            location.getDriverId()
        );

        // 2. Broadcast to WebSockets for real-time UI updates
        messagingTemplate.convertAndSend("/topic/drivers", location);
    }
}
