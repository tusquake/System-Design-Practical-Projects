package com.ffplatform.webhookservice.service;

import com.google.cloud.spring.pubsub.support.BasicAcknowledgeablePubsubMessage;
import com.google.cloud.spring.pubsub.support.GcpPubSubHeaders;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class WebhookEventListener {

    private final WebhookDeliveryService deliveryService;

    @ServiceActivator(inputChannel = "pubsubInputChannel")
    public void messageReceiver(String payload,
                                @Header(GcpPubSubHeaders.ORIGINAL_MESSAGE) BasicAcknowledgeablePubsubMessage message) {
        log.info("Received flag update event for key: {}", payload);
        
        // In a real system, you would fetch active webhooks from DB
        // For demonstration, we'll use a dummy URL
        Map<String, Object> webhookPayload = new HashMap<>();
        webhookPayload.put("event", "flag.updated");
        webhookPayload.put("flagKey", payload);
        webhookPayload.put("timestamp", System.currentTimeMillis());

        try {
            // Logic to fetch webhook URLs from DB would go here
            String dummyWebhookUrl = "https://example.com/webhooks/receiver";
            deliveryService.deliver(dummyWebhookUrl, webhookPayload);
            message.ack();
        } catch (Exception e) {
            log.error("Error processing webhook for flag {}: {}", payload, e.getMessage());
            message.nack(); // Nack will trigger Pub/Sub retry
        }
    }
}
