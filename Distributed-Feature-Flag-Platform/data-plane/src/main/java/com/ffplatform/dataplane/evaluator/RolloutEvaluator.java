package com.ffplatform.dataplane.evaluator;

import com.google.common.hash.Hashing;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class RolloutEvaluator {

    /**
     * Determines if a user falls into a rollout bucket.
     * Formula: murmur3_32(userId + flagKey) % 100 < percentage
     */
    public boolean isUserInRollout(String userId, String flagKey, int percentage) {
        if (percentage >= 100) return true;
        if (percentage <= 0) return false;

        String input = userId + ":" + flagKey;
        int hash = Math.abs(Hashing.murmur3_32_fixed().hashString(input, StandardCharsets.UTF_8).asInt());
        return (hash % 100) < percentage;
    }

    /**
     * Deterministically assigns a variant based on weights.
     */
    public String getVariantAssignment(String userId, String flagKey, java.util.Map<String, Integer> variantWeights) {
        String input = userId + ":" + flagKey + ":variant";
        int hash = Math.abs(Hashing.murmur3_32_fixed().hashString(input, StandardCharsets.UTF_8).asInt());
        int bucket = hash % 100;

        int cumulativeWeight = 0;
        for (java.util.Map.Entry<String, Integer> entry : variantWeights.entrySet()) {
            cumulativeWeight += entry.getValue();
            if (bucket < cumulativeWeight) {
                return entry.getKey();
            }
        }
        return "control"; // Default fallback
    }
}
