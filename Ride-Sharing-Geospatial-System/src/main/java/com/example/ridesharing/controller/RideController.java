package com.example.ridesharing.controller;

import com.example.ridesharing.model.DriverMatch;
import com.example.ridesharing.model.RiderRequest;
import com.example.ridesharing.service.RideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    @PostMapping("/search")
    public ResponseEntity<List<DriverMatch>> findDrivers(@RequestBody RiderRequest request) {
        List<DriverMatch> drivers = rideService.findNearbyDrivers(request);
        return ResponseEntity.ok(drivers);
    }
}
