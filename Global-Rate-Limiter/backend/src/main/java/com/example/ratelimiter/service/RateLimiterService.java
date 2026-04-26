package com.example.ratelimiter.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scripting.support.ResourceScriptSource;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Service
public class RateLimiterService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private final DefaultRedisScript<Long> script;

    public RateLimiterService() {
        this.script = new DefaultRedisScript<>();
        this.script.setResultType(Long.class);
        this.script.setScriptSource(new ResourceScriptSource(new ClassPathResource("scripts/token_bucket.lua")));
    }

    public boolean isAllowed(String clientId, int capacity, double refillRate) {
        String key = "ratelimit:" + clientId;
        
        // Refill rate is converted to tokens per MILLISECOND
        double refillPerMs = (double) refillRate / 1000.0;

        // Execute Lua Script: KEYS[1]=key, ARGV[1]=capacity, ARGV[2]=refill_per_ms
        Long result = redisTemplate.execute(
            script,
            Collections.singletonList(key),
            String.valueOf(capacity),
            String.valueOf(refillPerMs)
        );

        System.out.println("Rate Limit Check: Key=" + key + " | Tokens Left=" + result);

        return result != null && result >= 0;
    }
}
