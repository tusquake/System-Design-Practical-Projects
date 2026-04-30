package com.example.collabdoc.controller;

import com.example.collabdoc.model.DocumentUpdate;
import com.example.collabdoc.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class EditorController {

    private final DocumentService documentService;

    /**
     * Handles incoming document updates and broadcasts them to all other users
     * subscribed to the document's specific topic.
     */
    @MessageMapping("/edit/{docId}")
    @SendTo("/topic/document/{docId}")
    public DocumentUpdate processUpdate(@DestinationVariable String docId, DocumentUpdate update) {
        // Save the update chunk to Redis for new users joining late
        documentService.saveUpdate(docId, update.getUpdate());
        
        System.out.println("Update received and saved for doc: " + docId + " from: " + update.getSenderId());
        return update;
    }
}
