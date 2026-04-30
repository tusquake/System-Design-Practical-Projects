package com.example.collabdoc.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final RedisTemplate<String, String> redisTemplate;

    /**
     * Saves a Yjs binary update chunk (Base64 encoded) to the Redis list for a specific document.
     */
    public void saveUpdate(String docId, String updateBase64) {
        String key = "doc:" + docId + ":updates";
        redisTemplate.opsForList().rightPush(key, updateBase64);
    }

    /**
     * Retrieves all historical updates for a document.
     * When a client connects, they can apply all these updates sequentially to reconstruct the document.
     */
    public List<String> getDocumentUpdates(String docId) {
        String key = "doc:" + docId + ":updates";
        return redisTemplate.opsForList().range(key, 0, -1);
    }
}
