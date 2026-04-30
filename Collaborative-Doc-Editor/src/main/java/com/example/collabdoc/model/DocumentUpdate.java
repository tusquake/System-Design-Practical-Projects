package com.example.collabdoc.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DocumentUpdate {
    private String docId;
    private String update; // Base64 encoded Yjs update chunk
    private String senderId;
}
