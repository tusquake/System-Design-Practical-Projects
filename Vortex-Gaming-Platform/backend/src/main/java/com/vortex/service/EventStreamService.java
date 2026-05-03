package com.vortex.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventStreamService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String MATCH_STREAM_KEY = "vortex:match:events";

    /**
     * Publish a match result to the Redis Stream.
     * XADD match:events * playerId user1 score 500
     */
    public void publishMatchResult(String playerId, int score) {
        Map<String, String> data = Map.of(
            "playerId", playerId,
            "score", String.valueOf(score),
            "timestamp", String.valueOf(System.currentTimeMillis())
        );

        ObjectRecord<String, Map<String, String>> record = StreamRecords.newRecord()
                .in(MATCH_STREAM_KEY)
                .ofObject(data);

        RecordId recordId = redisTemplate.opsForStream().add(record);
        log.info("Published match event for player {} with ID {}", playerId, recordId);
    }

    /**
     * In a real production app, you would have a @Scheduled or a 
     * Container-based listener to consume these events.
     * This method demonstrates manual consumption (read-next).
     */
    public void consumeNextEvent() {
        // Read from the start for demo purposes
        StreamOffset<String> offset = StreamOffset.fromStart(MATCH_STREAM_KEY);
        var messages = redisTemplate.opsForStream().read(offset);
        
        if (messages != null) {
            messages.forEach(m -> {
                log.info("Consuming Match Event: ID={}, Data={}", m.getId(), m.getValue());
                // Logic to distribute rewards would go here
            });
        }
    }
}
