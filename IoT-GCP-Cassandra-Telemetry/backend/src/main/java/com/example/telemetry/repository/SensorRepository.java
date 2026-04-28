package com.example.telemetry.repository;

import com.example.telemetry.model.SensorReading;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SensorRepository extends CassandraRepository<SensorReading, String> {

    // Fetch latest readings for a sensor in a specific day bucket
    List<SensorReading> findBySensorIdAndDayBucket(String sensorId, String dayBucket);

    // Fetch readings within a specific time range for a sensor in a day bucket
    @Query("SELECT * FROM sensor_readings WHERE sensor_id = ?0 AND day_bucket = ?1 AND recorded_at >= ?2 AND recorded_at <= ?3")
    List<SensorReading> findReadingsInTimeRange(String sensorId, String dayBucket, Instant start, Instant end);
}
