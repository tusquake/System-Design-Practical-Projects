package com.vortex.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String DAILY_LOGINS_PREFIX = "vortex:logins:";
    private static final String UNIQUE_VIEWERS_PREFIX = "vortex:viewers:";

    /**
     * Track user login using Bitmaps.
     * Each bit index represents a User ID.
     * Memory: 1 million users take ~125KB.
     */
    public void trackLogin(long userId) {
        String key = DAILY_LOGINS_PREFIX + getTodayDate();
        redisTemplate.opsForValue().setBit(key, userId, true);
    }

    /**
     * Count total active users for today using Bitmaps.
     */
    public Long getDailyActiveUsersCount() {
        String key = DAILY_LOGINS_PREFIX + getTodayDate();
        return (Long) redisTemplate.execute(connection -> connection.bitCount(key.getBytes()), true);
    }

    /**
     * Track unique viewers for a tournament using HyperLogLog.
     * Error margin: ~0.81%.
     * Memory: Fixed at ~12KB regardless of number of viewers.
     */
    public void trackUniqueViewer(String tournamentId, String viewerId) {
        String key = UNIQUE_VIEWERS_PREFIX + tournamentId;
        redisTemplate.opsForHyperLogLog().add(key, viewerId);
    }

    /**
     * Get estimated unique viewer count.
     */
    public Long getUniqueViewerCount(String tournamentId) {
        String key = UNIQUE_VIEWERS_PREFIX + tournamentId;
        return redisTemplate.opsForHyperLogLog().size(key);
    }

    private String getTodayDate() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    }
}
