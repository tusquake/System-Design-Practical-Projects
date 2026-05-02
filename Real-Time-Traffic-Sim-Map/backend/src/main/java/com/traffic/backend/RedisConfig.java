package com.traffic.backend;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Configuration
public class RedisConfig {

    @Bean
    RedisMessageListenerContainer container(RedisConnectionFactory connectionFactory,
                                            MessageListenerAdapter listenerAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(listenerAdapter, new PatternTopic("traffic_channel"));
        container.addMessageListener(listenerAdapter, new PatternTopic("incident_channel"));
        return container;
    }

    @Bean
    MessageListenerAdapter listenerAdapter(TrafficRedisListener receiver) {
        return new MessageListenerAdapter(receiver, "onMessage");
    }

    @Service
    public static class TrafficRedisListener {
        private final SimpMessagingTemplate messagingTemplate;

        public TrafficRedisListener(SimpMessagingTemplate messagingTemplate) {
            this.messagingTemplate = messagingTemplate;
        }

        public void onMessage(String message) {
            // Check message type and route accordingly
            if (message.contains("\"type\":\"incident\"")) {
                messagingTemplate.convertAndSend("/topic/incidents", message);
            } else {
                messagingTemplate.convertAndSend("/topic/traffic", message);
            }
        }
    }
}
