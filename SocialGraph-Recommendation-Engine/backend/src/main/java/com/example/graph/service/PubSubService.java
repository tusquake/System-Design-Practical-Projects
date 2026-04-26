package com.example.graph.service;

import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class PubSubService {

    @Autowired
    private PubSubTemplate pubSubTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    public void publishGraphEvent(String type, Map<String, String> data) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                "eventType", type,
                "data", data
            ));
            pubSubTemplate.publish("graph-ingestion-topic", payload);
            System.out.println("Published graph event: " + type);
        } catch (Exception e) {
            System.err.println("Failed to publish event: " + e.getMessage());
        }
    }
}
