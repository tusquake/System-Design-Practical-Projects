package com.example.ridesharing.controller;

import com.example.ridesharing.model.DriverLocation;
import com.example.ridesharing.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping("/location")
    public ResponseEntity<String> updateLocation(@RequestBody DriverLocation location) {
        driverService.updateLocation(location);
        return ResponseEntity.ok("Location updated");
    }
}
