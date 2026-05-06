package com.collab.notification.consumer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
public class NotificationConsumer {

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            dltStrategy = org.springframework.kafka.retrytopic.DltStrategy.FAIL_ON_ERROR
    )
    @KafkaListener(topics = "chat.messages", groupId = "notification-group")
    public void consumeChatMessage(@Payload Map<String, Object> message, 
                                 @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        log.info("Received message for notification: {} from topic: {}", message, topic);
        
        // Simulate notification logic
        String content = (String) message.get("content");
        if (content != null && content.contains("fail")) {
            log.error("Simulating processing failure for message: {}", content);
            throw new RuntimeException("Notification delivery failed");
        }
        
        log.info("Notification sent successfully for message: {}", content);
    }

    @DltHandler
    public void handleDlt(@Payload Map<String, Object> message, 
                        @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        log.error("Message moved to DLQ: {} from topic: {}", message, topic);
        // Here you would typically save to DB or notify ops
    }
}
