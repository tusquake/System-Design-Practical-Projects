package com.example.graph.service;

import com.example.graph.model.User;
import com.example.graph.model.Interest;
import com.example.graph.repository.UserRepository;
import com.example.graph.repository.InterestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import com.google.cloud.spring.pubsub.support.BasicAcknowledgeablePubsubMessage;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PubSubGraphConsumer {

    @Autowired
    private PubSubTemplate pubSubTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InterestRepository interestRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @PostConstruct
    public void startSubscriber() {
        System.out.println("Starting Background Graph Ingestor (GCP Pub/Sub)...");
        
        pubSubTemplate.subscribe("graph-ingestion-sub", (message) -> {
            try {
                String payload = message.getPubsubMessage().getData().toStringUtf8();
                processMessage(payload);
                message.ack(); // Success! Remove from queue
            } catch (Exception e) {
                System.err.println("Worker failed to process event: " + e.getMessage());
                message.nack(); // Error! Leave it in queue to retry later
            }
        });
    }

    private void processMessage(String payload) throws Exception {
        Map<String, Object> event = objectMapper.readValue(payload, Map.class);
        String type = (String) event.get("eventType");
        Map<String, String> data = (Map<String, String>) event.get("data");

        if ("FOLLOW".equals(type)) {
            String follower = data.get("follower");
            String followed = data.get("followed");
            User u1 = userRepository.findById(follower).orElseThrow();
            User u2 = userRepository.findById(followed).orElseThrow();
            u1.follow(u2);
            userRepository.save(u1);
            System.out.println("Background worker: Processed Follow (" + follower + " -> " + followed + ")");
        } else if ("LIKE".equals(type)) {
            String username = data.get("username");
            String interestName = data.get("interestName");
            User u = userRepository.findById(username).orElseThrow();
            Interest i = interestRepository.findById(interestName).orElseThrow();
            u.like(i);
            userRepository.save(u);
            System.out.println("Background worker: Processed Like (" + username + " likes " + interestName + ")");
        }
    }
}
