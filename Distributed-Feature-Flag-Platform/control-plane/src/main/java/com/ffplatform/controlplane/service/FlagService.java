package com.ffplatform.controlplane.service;

import com.ffplatform.controlplane.model.FeatureFlag;
import com.ffplatform.controlplane.repository.FeatureFlagRepository;
import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlagService {
    private final FeatureFlagRepository repository;
    private final PubSubTemplate pubSubTemplate;

    @Value("${app.pubsub.topic-name:flag-updates}")
    private String topicName;

    public List<FeatureFlag> getAllFlags() {
        return repository.findAll();
    }

    public FeatureFlag getFlagByKey(String key) {
        return repository.findByKey(key)
                .orElseThrow(() -> new RuntimeException("Flag not found: " + key));
    }

    @Transactional
    public FeatureFlag createOrUpdateFlag(FeatureFlag flag) {
        FeatureFlag savedFlag = repository.save(flag);
        notifyUpdate(savedFlag.getKey());
        return savedFlag;
    }

    @Transactional
    public void deleteFlag(String key) {
        FeatureFlag flag = getFlagByKey(key);
        repository.delete(flag);
        notifyUpdate(key);
    }

    private void notifyUpdate(String flagKey) {
        log.info("Notifying update for flag: {}", flagKey);
        pubSubTemplate.publish(topicName, flagKey);
    }
}
