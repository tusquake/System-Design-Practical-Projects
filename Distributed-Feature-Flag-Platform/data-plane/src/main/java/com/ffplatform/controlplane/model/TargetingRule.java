package com.ffplatform.controlplane.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "targeting_rules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TargetingRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "flag_id")
    @JsonIgnore
    private FeatureFlag flag;

    @Column(name = "attribute_name")
    private String attributeName;

    private String operator; // EQUALS, IN, CONTAINS, etc.

    @Column(name = "attribute_value")
    private String attributeValue; // Stored as JSON string or plain text

    private int priority;
}
