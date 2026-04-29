package com.example.ridesharing.service;

import com.example.ridesharing.model.DriverMatch;
import com.example.ridesharing.model.RiderRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.domain.geo.Metrics;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String DRIVER_GEO_KEY = "drivers:locations";

    public List<DriverMatch> findNearbyDrivers(RiderRequest request) {
        // Define the search area (Point + Radius)
        Point center = new Point(request.getLongitude(), request.getLatitude());
        Distance radius = new Distance(request.getRadiusInKm(), Metrics.KILOMETERS);
        Circle circle = new Circle(center, radius);

        // Include distance in the result and sort by nearest
        RedisGeoCommands.GeoRadiusCommandArgs args = RedisGeoCommands.GeoRadiusCommandArgs
                .newGeoRadiusArgs()
                .includeDistance()
                .sortAscending()
                .limit(5); // Return top 5 nearest

        GeoResults<RedisGeoCommands.GeoLocation<Object>> results = redisTemplate.opsForGeo()
                .radius(DRIVER_GEO_KEY, circle, args);

        if (results == null) return List.of();

        return results.getContent().stream()
                .map(res -> {
                    RedisGeoCommands.GeoLocation<Object> location = res.getContent();
                    return new DriverMatch(
                        location.getName().toString(),
                        res.getDistance().getValue(),
                        res.getDistance().getUnit(),
                        location.getPoint().getY(), // Latitude
                        location.getPoint().getX()  // Longitude
                    );
                })
                .collect(Collectors.toList());
    }
}
