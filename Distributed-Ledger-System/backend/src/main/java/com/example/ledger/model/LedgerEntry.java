package com.example.ledger.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long walletId;

    private BigDecimal amount; // Positive for Credit, Negative for Debit

    private String type; // TRANSFER, DEPOSIT, WITHDRAW

    private String description;

    @Column(unique = true)
    private String idempotencyKey;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
