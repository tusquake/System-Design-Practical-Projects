package com.vortex.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String AUTOCOMPLETE_KEY = "vortex:search:players";

    /**
     * Add a player name to the autocomplete index.
     * We add the name to a Sorted Set with score 0.
     * This allows us to use Lexicographical range queries.
     */
    public void addPlayerToSearch(String name) {
        redisTemplate.opsForZSet().add(AUTOCOMPLETE_KEY, name, 0);
    }

    /**
     * Find names starting with the prefix.
     * Uses ZRANGEBYLEX pattern.
     */
    public Set<Object> suggest(String prefix) {
        String start = "[" + prefix;
        String end = "[" + prefix + "\uffff";
        
        // Use raw connection to access Lex commands easily
        return redisTemplate.opsForZSet().rangeByLex(AUTOCOMPLETE_KEY, 
                org.springframework.data.redis.connection.RedisZSetCommands.Range.range()
                    .gte(prefix)
                    .lte(prefix + "\uffff")
        );
    }
}
