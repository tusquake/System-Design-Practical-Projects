package com.example.telemetry.controller;

import com.example.telemetry.model.SensorReading;
import com.example.telemetry.repository.SensorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/telemetry")
@CrossOrigin(origins = "*")
public class TelemetryController {

    @Autowired
    private SensorRepository sensorRepository;

    @GetMapping("/{sensorId}/latest")
    public List<SensorReading> getLatest(@PathVariable String sensorId, @RequestParam(required = false) String day) {
        String dayBucket = (day != null) ? day : LocalDate.now().toString();
        return sensorRepository.findBySensorIdAndDayBucket(sensorId, dayBucket);
    }

    @GetMapping("/{sensorId}/range")
    public List<SensorReading> getRange(
            @PathVariable String sensorId,
            @RequestParam String day,
            @RequestParam String start,
            @RequestParam String end) {
        
        return sensorRepository.findReadingsInTimeRange(
                sensorId, 
                day, 
                Instant.parse(start), 
                Instant.parse(end)
        );
    }
}
