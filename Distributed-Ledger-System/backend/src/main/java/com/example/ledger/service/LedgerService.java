package com.example.ledger.service;

import com.example.ledger.model.LedgerEntry;
import com.example.ledger.model.Wallet;
import com.example.ledger.repository.LedgerRepository;
import com.example.ledger.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LedgerService {

    private final WalletRepository walletRepository;
    private final LedgerRepository ledgerRepository;

    @Transactional
    public void transfer(String fromUser, String toUser, BigDecimal amount, String idempotencyKey) {
        // 1. Idempotency Check: Have we already processed this request?
        if (ledgerRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return; // Already processed, ignore duplicate
        }

        // 2. Load Wallets
        Wallet fromWallet = walletRepository.findByUsername(fromUser)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        Wallet toWallet = walletRepository.findByUsername(toUser)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        // 3. Balance Check
        if (fromWallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient funds");
        }

        // 4. Perform the logic
        fromWallet.setBalance(fromWallet.getBalance().subtract(amount));
        toWallet.setBalance(toWallet.getBalance().add(amount));

        // 5. Save Wallets
        walletRepository.save(fromWallet);
        walletRepository.save(toWallet);

        // 6. Record Ledger Entries (The Audit Trail)
        ledgerRepository.save(LedgerEntry.builder()
                .walletId(fromWallet.getId())
                .amount(amount.negate())
                .type("TRANSFER_OUT")
                .description("Sent to " + toUser)
                .idempotencyKey(idempotencyKey)
                .build());

        ledgerRepository.save(LedgerEntry.builder()
                .walletId(toWallet.getId())
                .amount(amount)
                .type("TRANSFER_IN")
                .description("Received from " + fromUser)
                .idempotencyKey(idempotencyKey + "_RECEIVE") // Unique key for the other side
                .build());
    }

    public List<LedgerEntry> getHistory(String username) {
        Wallet wallet = walletRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Wallet not found"));
        return ledgerRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());
    }

    public Wallet createWallet(String username, BigDecimal initialBalance) {
        return walletRepository.save(Wallet.builder()
                .username(username)
                .balance(initialBalance)
                .build());
    }
}
