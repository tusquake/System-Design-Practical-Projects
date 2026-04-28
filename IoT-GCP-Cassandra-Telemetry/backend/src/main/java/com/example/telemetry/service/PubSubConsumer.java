package com.example.telemetry.service;

import com.example.telemetry.model.SensorReading;
import com.example.telemetry.repository.SensorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;

@Service
@Slf4j
public class PubSubConsumer {

    @Autowired
    private PubSubTemplate pubSubTemplate;

    @Autowired
    private SensorRepository sensorRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.pubsub.subscription-name}")
    private String subscriptionName;

    @PostConstruct
    public void subscribe() {
        log.info("Subscribing to {}", subscriptionName);
        pubSubTemplate.subscribe(subscriptionName, (message) -> {
            try {
                String payload = message.getPubsubMessage().getData().toStringUtf8();
                log.info("Received message: {}", payload);

                SensorReading reading = objectMapper.readValue(payload, SensorReading.class);
                
                // Ensure metadata is set if not provided in JSON
                if (reading.getRecordedAt() == null) {
                    reading.setRecordedAt(Instant.now());
                }
                if (reading.getDayBucket() == null) {
                    reading.setDayBucket(LocalDate.now().toString());
                }

                sensorRepository.save(reading);
                log.info("Saved reading for sensor: {}", reading.getSensorId());

                message.ack();
            } catch (Exception e) {
                log.error("Error processing message", e);
                // Nack if we want to retry, but for IoT often we just move on or DLQ
                message.nack();
            }
        });
    }
}
