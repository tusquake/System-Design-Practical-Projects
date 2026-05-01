package com.ffplatform.controlplane.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.List;

@Entity
@Table(name = "feature_flags")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeatureFlag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String key;

    private String description;

    private boolean enabled;

    @Column(name = "is_kill_switch")
    private boolean killSwitch;

    @Column(name = "rollout_percentage")
    private int rolloutPercentage;

    @OneToMany(mappedBy = "flag", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<TargetingRule> rules;

    @OneToMany(mappedBy = "flag", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<Variant> variants;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
