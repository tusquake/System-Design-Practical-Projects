package com.collab.notification.consumer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class NotificationConsumer {

    /**
     * Consumes messages from chat.messages topic.
     * - Retries up to 3 times with exponential backoff (2s, 4s)
     * - On final failure moves to Dead Letter Topic (DLT)
     *
     * Key design: payload is consumed as String to avoid deserialization
     * failures if the message schema evolves. Parse as needed.
     */
    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            dltStrategy = DltStrategy.FAIL_ON_ERROR,
            autoCreateTopics = "true"
    )
    @KafkaListener(topics = "chat.messages", groupId = "notification-group")
    public void consumeChatMessage(
            @Payload String rawMessage,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        log.info("[NOTIFICATION] topic={} partition={} offset={}", topic, partition, offset);
        log.info("[NOTIFICATION] Processing message: {}", rawMessage);

        // Simulate a deliberate failure for messages containing the word "fail"
        if (rawMessage.contains("\"fail\"") || rawMessage.contains("fail")) {
            log.error("[NOTIFICATION] Simulating delivery failure. Will retry.");
            throw new RuntimeException("Notification delivery failed (simulated)");
        }

        // In production: send push notification, email, or in-app alert
        log.info("[NOTIFICATION] Notification dispatched successfully.");
    }

    /**
     * Dead Letter Topic handler — called after all retries are exhausted.
     * In production: persist to DB, alert on-call, or expose via admin API.
     */
    @DltHandler
    public void handleDlt(
            @Payload String rawMessage,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        log.error("[DLQ] Message could not be processed after all retries.");
        log.error("[DLQ] Topic: {} | Message: {}", topic, rawMessage);
    }
}
