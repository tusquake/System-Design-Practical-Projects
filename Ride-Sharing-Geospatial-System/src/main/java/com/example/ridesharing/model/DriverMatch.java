package com.example.ridesharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DriverMatch {
    private String driverId;
    private double distance;
    private String unit;
    private double latitude;
    private double longitude;
}
