package com.example.collabdoc.controller;

import com.example.collabdoc.model.DocumentUpdate;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class EditorController {

    /**
     * Handles incoming document updates and broadcasts them to all other users
     * subscribed to the document's specific topic.
     */
    @MessageMapping("/edit/{docId}")
    @SendTo("/topic/document/{docId}")
    public DocumentUpdate processUpdate(@DestinationVariable String docId, DocumentUpdate update) {
        // In a production app, we would save the update to Redis/DB here
        System.out.println("Update received for doc: " + docId + " from: " + update.getSenderId());
        return update;
    }
}
