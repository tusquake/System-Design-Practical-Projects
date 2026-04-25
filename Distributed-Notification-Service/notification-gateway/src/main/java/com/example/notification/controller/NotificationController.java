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
    private final com.example.notification.service.SchedulingService schedulingService;

    @Value("${notification.topic.name}")
    private String topicName;

    public NotificationController(PubSubTemplate pubSubTemplate, ObjectMapper objectMapper,
            com.example.notification.service.SchedulingService schedulingService) {
        this.pubSubTemplate = pubSubTemplate;
        this.objectMapper = objectMapper;
        this.schedulingService = schedulingService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> sendNotification(@RequestBody NotificationRequest request) {
        log.info("Received notification request for: {}", request.getRecipient());
        publishToPubSub(request);
        return ResponseEntity.ok(Map.of("status", "ACCEPTED", "message", "Notification queued"));
    }

    @PostMapping("/schedule")
    public ResponseEntity<Map<String, String>> scheduleNotification(
            @RequestBody NotificationRequest request,
            @RequestParam(defaultValue = "60") long delaySeconds) {

        log.info("Scheduling notification for: {} with delay: {}s", request.getRecipient(), delaySeconds);
        schedulingService.scheduleNotification(request, delaySeconds);

        return ResponseEntity.ok(Map.of(
                "status", "SCHEDULED",
                "message", "Notification will be sent in " + delaySeconds + " seconds"));
    }

    private void publishToPubSub(NotificationRequest request) {
        try {
            String messageJson = objectMapper.writeValueAsString(request);
            pubSubTemplate.publish(topicName, messageJson);
            log.info("Published to Pub/Sub: {}", topicName);
        } catch (Exception e) {
            throw new RuntimeException("Pub/Sub publishing failed", e);
        }
    }
}
