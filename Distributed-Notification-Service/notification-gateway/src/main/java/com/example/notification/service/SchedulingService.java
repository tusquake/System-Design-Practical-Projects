package com.example.notification.service;

import com.example.notification.dto.NotificationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.gax.core.FixedCredentialsProvider;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.tasks.v2.*;
import com.google.protobuf.ByteString;
import com.google.protobuf.Timestamp;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;

@Service
@Slf4j
public class SchedulingService {

    @Value("${gcp.project-id:homegenie-prod}")
    private String projectId;

    @Value("${gcp.location-id:us-central1}")
    private String locationId;

    @Value("${gcp.queue-id:notification-queue}")
    private String queueId;

    @Value("${notification.gateway.url}")
    private String gatewayUrl; // The public URL of your Spring Boot app

    private final ObjectMapper objectMapper;

    public SchedulingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void scheduleNotification(NotificationRequest request, long delaySeconds) {
        try {
            String payload = objectMapper.writeValueAsString(request);

            GoogleCredentials credentials = GoogleCredentials.fromStream(
                new FileInputStream("D:/System Design Practical Projects/gcs-signed-url-system/homegenie-prod-97c358d8431e.json")
            );
            
            CloudTasksSettings settings = CloudTasksSettings.newBuilder()
                .setCredentialsProvider(FixedCredentialsProvider.create(credentials))
                .build();

            try (CloudTasksClient client = CloudTasksClient.create(settings)) {
                String queuePath = QueueName.of(projectId, locationId, queueId).toString();
                
                long targetTimestamp = Instant.now(Clock.systemUTC()).getEpochSecond() + delaySeconds;
                
                log.info("Creating task for queue: {}", queuePath);
                log.info("Target Schedule Time (UTC): {}", Instant.ofEpochSecond(targetTimestamp));

                Task task = Task.newBuilder()
                        .setHttpRequest(
                                HttpRequest.newBuilder()
                                        .setBody(ByteString.copyFrom(payload, StandardCharsets.UTF_8))
                                        .setUrl(gatewayUrl + "/v1/notify")
                                        .setHttpMethod(HttpMethod.POST)
                                        .putHeaders("Content-Type", "application/json")
                                        .build()
                        )
                        .setScheduleTime(
                                Timestamp.newBuilder()
                                        .setSeconds(targetTimestamp)
                                        .build())
                        .build();

                client.createTask(queuePath, task);
                log.info("Task created successfully in GCP! Check the 'Tasks' tab now.");
            }

        } catch (Exception e) {
            log.error("Failed to schedule task", e);
            throw new RuntimeException("Scheduling failed", e);
        }
    }
}
