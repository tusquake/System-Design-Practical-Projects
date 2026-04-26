package com.example.ratelimiter.controller;

import com.example.ratelimiter.config.RateLimit;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/v1/api")
public class TestController {

    @GetMapping("/limited")
    @RateLimit(capacity = 5, refillRate = 0.3333) // 1 token every 3 seconds
    public Map<String, String> limitedEndpoint() {
        return Map.of(
            "status", "success",
            "message", "You accessed a protected resource!",
            "note", "If you hit this 6 times quickly, you will be blocked."
        );
    }

    @GetMapping("/unlimited")
    public Map<String, String> unlimitedEndpoint() {
        return Map.of("status", "success", "message", "I am free for all!");
    }
}
