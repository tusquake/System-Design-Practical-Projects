package com.vortex.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TournamentService {

    private final RedissonClient redissonClient;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String TOURNAMENT_SLOTS_PREFIX = "vortex:tournament:slots:";
    private static final String JOIN_LOCK_PREFIX = "vortex:lock:join:";

    /**
     * Attempt to join a tournament with a limited number of slots.
     * Uses Redlock to prevent over-subscription in a distributed environment.
     */
    public boolean joinTournament(String tournamentId, String playerId) {
        String lockKey = JOIN_LOCK_PREFIX + tournamentId;
        RLock lock = redissonClient.getLock(lockKey);

        try {
            // Wait for 5s to acquire lock, hold for 10s
            if (lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                try {
                    String slotsKey = TOURNAMENT_SLOTS_PREFIX + tournamentId;
                    Integer availableSlots = (Integer) redisTemplate.opsForValue().get(slotsKey);

                    if (availableSlots != null && availableSlots > 0) {
                        // Atomic decrement (not strictly needed with the lock, but good practice)
                        redisTemplate.opsForValue().decrement(slotsKey);
                        log.info("Player {} joined tournament {}. Slots left: {}", playerId, tournamentId, availableSlots - 1);
                        return true;
                    } else {
                        log.warn("Tournament {} is full!", tournamentId);
                        return false;
                    }
                } finally {
                    lock.unlock();
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return false;
    }

    public void initializeSlots(String tournamentId, int count) {
        redisTemplate.opsForValue().set(TOURNAMENT_SLOTS_PREFIX + tournamentId, count);
    }
}
