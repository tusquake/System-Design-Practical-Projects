package com.ffplatform.dataplane.grpc;

import com.ffplatform.controlplane.model.FeatureFlag;
import com.ffplatform.controlplane.model.TargetingRule;
import com.ffplatform.controlplane.model.Variant;
import com.ffplatform.dataplane.evaluator.RolloutEvaluator;
import com.ffplatform.dataplane.evaluator.RuleEvaluator;
import com.ffplatform.grpc.*;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.cache.annotation.Cacheable;
import com.ffplatform.controlplane.repository.FeatureFlagRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@GrpcService
@RequiredArgsConstructor
@Slf4j
public class EvaluationServiceImpl extends EvaluationServiceGrpc.EvaluationServiceImplBase {

    private final FeatureFlagRepository repository;
    private final RolloutEvaluator rolloutEvaluator;
    private final RuleEvaluator ruleEvaluator;

    // Local cache for streaming clients
    private final Map<String, StreamObserver<FlagUpdate>> streamingClients = new ConcurrentHashMap<>();

    @Override
    public void getEvaluation(EvaluationRequest request, StreamObserver<EvaluationResponse> responseObserver) {
        try {
            FeatureFlag flag = getFlagWithCaching(request.getFlagKey());
            EvaluationResponse response = evaluate(flag, request.getUserId(), request.getContextMap());
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Error evaluating flag {}: {}", request.getFlagKey(), e.getMessage());
            responseObserver.onError(e);
        }
    }

    @Override
    public StreamObserver<ClientInfo> streamUpdates(StreamObserver<FlagUpdate> responseObserver) {
        return new StreamObserver<ClientInfo>() {
            private String clientId;

            @Override
            public void onNext(ClientInfo clientInfo) {
                this.clientId = clientInfo.getClientId();
                streamingClients.put(clientId, responseObserver);
                log.info("Client {} subscribed for updates", clientId);
            }

            @Override
            public void onError(Throwable t) {
                if (clientId != null) streamingClients.remove(clientId);
            }

            @Override
            public void onCompleted() {
                if (clientId != null) streamingClients.remove(clientId);
                responseObserver.onCompleted();
            }
        };
    }

    @Cacheable(value = "flags", key = "#key")
    public FeatureFlag getFlagWithCaching(String key) {
        log.info("Cache miss for flag: {}", key);
        return repository.findByKey(key)
                .orElseThrow(() -> new RuntimeException("Flag not found"));
    }

    private EvaluationResponse evaluate(FeatureFlag flag, String userId, Map<String, String> context) {
        // 1. Kill Switch check
        if (flag.isKillSwitch()) {
            return EvaluationResponse.newBuilder()
                    .setFlagKey(flag.getKey())
                    .setEnabled(false)
                    .setVariant("none")
                    .build();
        }

        // 2. Targeting Rules
        boolean rulesMatch = true;
        if (flag.getRules() != null && !flag.getRules().isEmpty()) {
            for (TargetingRule rule : flag.getRules()) {
                if (!ruleEvaluator.evaluateRule(rule.getAttributeName(), rule.getOperator(), rule.getAttributeValue(), context)) {
                    rulesMatch = false;
                    break;
                }
            }
        }

        if (!rulesMatch) {
            return EvaluationResponse.newBuilder()
                    .setFlagKey(flag.getKey())
                    .setEnabled(false)
                    .build();
        }

        // 3. Rollout Percentage
        boolean inRollout = rolloutEvaluator.isUserInRollout(userId, flag.getKey(), flag.getRolloutPercentage());
        if (!inRollout) {
            return EvaluationResponse.newBuilder()
                    .setFlagKey(flag.getKey())
                    .setEnabled(false)
                    .build();
        }

        // 4. A/B Variant Assignment
        String variant = "default";
        if (flag.getVariants() != null && !flag.getVariants().isEmpty()) {
            Map<String, Integer> weights = flag.getVariants().stream()
                    .collect(Collectors.toMap(Variant::getKey, Variant::getWeight));
            variant = rolloutEvaluator.getVariantAssignment(userId, flag.getKey(), weights);
        }

        return EvaluationResponse.newBuilder()
                .setFlagKey(flag.getKey())
                .setEnabled(flag.isEnabled())
                .setVariant(variant)
                .build();
    }

    // This would be called by a Pub/Sub listener to push updates
    public void pushUpdate(String flagKey) {
        // Logic to fetch new flag state and push to relevant streamingClients
    }
}
