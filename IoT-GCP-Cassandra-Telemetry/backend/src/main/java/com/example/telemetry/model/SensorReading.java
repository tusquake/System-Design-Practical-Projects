package com.example.telemetry.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.Column;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyColumn;
import org.springframework.data.cassandra.core.mapping.Table;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table("sensor_readings")
public class SensorReading {

    @PrimaryKeyColumn(name = "sensor_id", ordinal = 0, type = PrimaryKeyType.PARTITIONED)
    private String sensorId;

    @PrimaryKeyColumn(name = "day_bucket", ordinal = 1, type = PrimaryKeyType.PARTITIONED)
    private String dayBucket; // e.g., "2024-04-28"

    @PrimaryKeyColumn(name = "recorded_at", ordinal = 2, type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private Instant recordedAt;

    @Column("temperature")
    private Double temperature;

    @Column("humidity")
    private Double humidity;

    @Column("pressure")
    private Double pressure;

    @Column("battery_level")
    private Integer batteryLevel;
}
