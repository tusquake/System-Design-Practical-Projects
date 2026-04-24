package com.example.notification.controller;

import com.example.notification.dto.NotificationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/notify")
@Slf4j
public class NotificationController {

    private final PubSubTemplate pubSubTemplate;
    private final ObjectMapper objectMapper;

    @Value("${notification.topic.name}")
    private String topicName;

    public NotificationController(PubSubTemplate pubSubTemplate, ObjectMapper objectMapper) {
        this.pubSubTemplate = pubSubTemplate;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> sendNotification(@RequestBody NotificationRequest request) {
        log.info("Received notification request for: {}", request.getRecipient());

        try {
            // Convert the object to JSON string for the message body
            String messageJson = objectMapper.writeValueAsString(request);
            
            // Publish to Pub/Sub
            pubSubTemplate.publish(topicName, messageJson);
            
            log.info("Successfully published message to topic: {}", topicName);
            
            return ResponseEntity.ok(Map.of(
                "status", "ACCEPTED",
                "message", "Notification queued for delivery"
            ));
            
        } catch (Exception e) {
            log.error("Failed to publish message", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "ERROR",
                "message", "Internal server error while queuing notification"
            ));
        }
    }
}
