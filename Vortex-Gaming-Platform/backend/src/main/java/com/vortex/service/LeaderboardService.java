package com.vortex.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String LEADERBOARD_KEY = "vortex:leaderboard";

    /**
     * Update player score in the global leaderboard.
     * Uses Redis ZSET (Sorted Set) - O(log N)
     */
    public void updateScore(String playerId, double score) {
        redisTemplate.opsForZSet().add(LEADERBOARD_KEY, playerId, score);
    }

    /**
     * Get Top N players by score.
     */
    public Set<ZSetOperations.TypedTuple<Object>> getTopPlayers(int limit) {
        return redisTemplate.opsForZSet().reverseRangeWithScores(LEADERBOARD_KEY, 0, limit - 1);
    }

    /**
     * Get a specific player's rank (0-indexed).
     */
    public Long getPlayerRank(String playerId) {
        return redisTemplate.opsForZSet().reverseRank(LEADERBOARD_KEY, playerId);
    }
}
