package com.example.ridesharing.model;

import lombok.Data;

@Data
public class RiderRequest {
    private String riderId;
    private double latitude;
    private double longitude;
    private double radiusInKm = 5.0; // Default search radius
}
