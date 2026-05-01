-- Database Schema for Distributed Feature Flag Platform

-- Feature Flags table
CREATE TABLE feature_flags (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    is_kill_switch BOOLEAN DEFAULT FALSE,
    rollout_percentage INT DEFAULT 100, -- 0 to 100
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Target Rules (JSON based for flexibility)
CREATE TABLE targeting_rules (
    id SERIAL PRIMARY KEY,
    flag_id INT REFERENCES feature_flags(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL, -- e.g., 'country', 'device'
    operator VARCHAR(50) NOT NULL, -- e.g., 'EQUALS', 'IN', 'CONTAINS'
    attribute_value TEXT NOT NULL, -- JSON array or single value
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- A/B Test Variants
CREATE TABLE variants (
    id SERIAL PRIMARY KEY,
    flag_id INT REFERENCES feature_flags(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL, -- e.g., 'control', 'variant_a'
    weight INT NOT NULL, -- Percentage of traffic (must sum to 100 for the flag)
    config_value TEXT, -- Optional JSON config for this variant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Configurations
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    secret_key TEXT,
    events TEXT[], -- Array of events like ['flag.updated', 'experiment.started']
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50), -- 'FLAG', 'WEBHOOK'
    entity_id INT,
    action VARCHAR(50), -- 'CREATE', 'UPDATE', 'DELETE', 'KILL_SWITCH_ACTIVATE'
    performed_by VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_flags_key ON feature_flags(key);
CREATE INDEX idx_rules_flag_id ON targeting_rules(flag_id);
CREATE INDEX idx_variants_flag_id ON variants(flag_id);
