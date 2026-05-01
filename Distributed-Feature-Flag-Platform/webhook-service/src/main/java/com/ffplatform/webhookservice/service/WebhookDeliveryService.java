package com.ffplatform.webhookservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class WebhookDeliveryService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Retryable(
        value = { Exception.class },
        maxAttempts = 5,
        backoff = @Backoff(delay = 2000, multiplier = 2) // Exponential backoff: 2s, 4s, 8s, 16s...
    )
    public void deliver(String url, Map<String, Object> payload) {
        log.info("Attempting webhook delivery to: {}", url);
        ResponseEntity<String> response = restTemplate.postForEntity(url, payload, String.class);
        
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Webhook failed with status: " + response.getStatusCode());
        }
        log.info("Webhook delivered successfully to: {}", url);
    }

    @Recover
    public void recover(Exception e, String url, Map<String, Object> payload) {
        log.error("Failed to deliver webhook to {} after all retries. Moving to DLQ logic. Error: {}", url, e.getMessage());
        // In a real system, you would push this to a DLQ (Dead Letter Queue) in Pub/Sub or a DB table
        saveToDeadLetterQueue(url, payload, e.getMessage());
    }

    private void saveToDeadLetterQueue(String url, Map<String, Object> payload, String error) {
        // Implementation for DLQ storage
        log.warn("Payload saved to DLQ for URL: {}", url);
    }
}
