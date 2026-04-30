package com.example.collabdoc.controller;

import com.example.collabdoc.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Endpoint to fetch the full history of a document when a client first joins.
     */
    @GetMapping("/{docId}")
    public List<String> getDocumentState(@PathVariable String docId) {
        return documentService.getDocumentUpdates(docId);
    }
}
