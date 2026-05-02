package com.traffic.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/traffic")
@CrossOrigin(origins = "*")
public class TrafficController {

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TrafficController(StringRedisTemplate redisTemplate, SimpMessagingTemplate messagingTemplate) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/initial")
    public String getInitialState() {
        return redisTemplate.opsForValue().get("traffic_full_state");
    }

    @GetMapping("/stats")
    public Map<String, Object> getTrafficStats() {
        String fullState = redisTemplate.opsForValue().get("traffic_full_state");
        if (fullState == null) return Collections.emptyMap();
        
        try {
            JsonNode root = objectMapper.readTree(fullState);
            JsonNode data = root.get("data");
            
            int low = 0, medium = 0, high = 0;
            if (data != null && data.isArray()) {
                for (JsonNode road : data) {
                    String congestion = road.get("congestion").asText();
                    if ("low".equals(congestion)) low++;
                    else if ("medium".equals(congestion)) medium++;
                    else if ("high".equals(congestion)) high++;
                }
            }
            
            int total = low + medium + high;
            int score = (total == 0) ? 0 : (int) (((medium * 0.5 + high * 1.0) / total) * 100);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("low", low);
            stats.put("medium", medium);
            stats.put("high", high);
            stats.put("total", total);
            stats.put("score", score);
            return stats;
        } catch (Exception e) {
            return Collections.singletonMap("error", e.getMessage());
        }
    }
    @PostMapping("/speed")
    public Map<String, String> setSimSpeed(@RequestParam("value") String value) {
        redisTemplate.opsForValue().set("sim_speed", value);
        return Collections.singletonMap("status", "ok");
    }
}
