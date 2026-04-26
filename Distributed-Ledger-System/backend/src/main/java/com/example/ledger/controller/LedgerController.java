package com.example.ledger.controller;

import com.example.ledger.model.LedgerEntry;
import com.example.ledger.model.Wallet;
import com.example.ledger.service.LedgerService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/ledger")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LedgerController {

    private final LedgerService ledgerService;

    @PostMapping("/wallets")
    public Wallet createWallet(@RequestBody WalletRequest request) {
        return ledgerService.createWallet(request.getUsername(), request.getInitialBalance());
    }

    @PostMapping("/transfer")
    public String transfer(@RequestBody TransferRequest request, 
                           @RequestHeader("X-Idempotency-Key") String key) {
        ledgerService.transfer(request.getFromUser(), request.getToUser(), request.getAmount(), key);
        return "Transfer Successful";
    }

    @GetMapping("/history/{username}")
    public List<LedgerEntry> getHistory(@PathVariable String username) {
        return ledgerService.getHistory(username);
    }

    @Data
    static class WalletRequest {
        private String username;
        private BigDecimal initialBalance;
    }

    @Data
    static class TransferRequest {
        private String fromUser;
        private String toUser;
        private BigDecimal amount;
    }
}
