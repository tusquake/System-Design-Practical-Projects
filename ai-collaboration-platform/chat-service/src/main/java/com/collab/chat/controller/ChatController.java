package com.collab.chat.controller;

import com.collab.chat.entity.Message;
import com.collab.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload Message message) {
        message.setTimestamp(LocalDateTime.now());
        
        // 1. Persist message
        messageRepository.save(message);

        // 2. Broadcast to topic for UI
        messagingTemplate.convertAndSend("/topic/" + message.getConversationId(), message);

        // 3. Publish to Kafka for downstream (AI, Search, Notifications)
        // Key is conversationId to ensure ordering in Kafka partitions
        kafkaTemplate.send("chat.messages", message.getConversationId(), message);
    }
}
