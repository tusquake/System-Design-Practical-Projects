package com.example.ledger.repository;

import com.example.ledger.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LedgerRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(Long walletId);
    Optional<LedgerEntry> findByIdempotencyKey(String idempotencyKey);
}
