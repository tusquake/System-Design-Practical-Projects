package com.example.urlshortener.service;

import com.example.urlshortener.model.UrlMapping;
import com.example.urlshortener.repository.UrlMappingRepository;
import com.example.urlshortener.util.Base62;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class UrlShortenerService {

    private final UrlMappingRepository repository;
    private final StringRedisTemplate redisTemplate;
    
    private static final String CACHE_PREFIX = "url:";

    @Transactional
    public String shortenUrl(String longUrl) {
        log.info("Shortening URL: {}", longUrl);
        
        // 1. Create initial record to get ID
        UrlMapping mapping = UrlMapping.builder()
                .longUrl(longUrl)
                .shortCode("PENDING") // Temporary placeholder
                .build();
        
        mapping = repository.save(mapping);
        
        // 2. Generate short code from ID
        String shortCode = Base62.encode(mapping.getId());
        mapping.setShortCode(shortCode);
        
        // 3. Update with real short code
        repository.save(mapping);
        
        // 4. Cache in Redis (1 day expiry)
        redisTemplate.opsForValue().set(CACHE_PREFIX + shortCode, longUrl, 1, TimeUnit.DAYS);
        
        return shortCode;
    }

    public String getLongUrl(String shortCode) {
        log.info("Resolving short code: {}", shortCode);
        
        // 1. Check Redis Cache
        String cachedUrl = redisTemplate.opsForValue().get(CACHE_PREFIX + shortCode);
        if (cachedUrl != null) {
            log.info("Cache HIT for code: {}", shortCode);
            return cachedUrl;
        }
        
        // 2. Check Database
        log.info("Cache MISS for code: {}. Checking DB...", shortCode);
        Optional<UrlMapping> mapping = repository.findByShortCode(shortCode);
        
        if (mapping.isPresent()) {
            String longUrl = mapping.get().getLongUrl();
            // Write back to cache
            redisTemplate.opsForValue().set(CACHE_PREFIX + shortCode, longUrl, 1, TimeUnit.DAYS);
            return longUrl;
        }
        
        return null;
    }
}
