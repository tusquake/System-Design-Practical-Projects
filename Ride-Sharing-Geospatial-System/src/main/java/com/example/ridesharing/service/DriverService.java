package com.example.ridesharing.service;

import com.example.ridesharing.model.DriverLocation;
import lombok.RequiredArgsConstructor;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String DRIVER_GEO_KEY = "drivers:locations";

    public void updateLocation(DriverLocation location) {
        // Redis GEOADD command
        redisTemplate.opsForGeo().add(
            DRIVER_GEO_KEY, 
            new Point(location.getLongitude(), location.getLatitude()), 
            location.getDriverId()
        );
    }
}
