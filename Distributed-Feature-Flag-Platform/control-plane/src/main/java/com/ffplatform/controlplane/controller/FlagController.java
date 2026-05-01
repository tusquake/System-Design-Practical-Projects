package com.ffplatform.controlplane.controller;

import com.ffplatform.controlplane.model.FeatureFlag;
import com.ffplatform.controlplane.service.FlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/flags")
@RequiredArgsConstructor
public class FlagController {
    private final FlagService flagService;

    @GetMapping
    public List<FeatureFlag> getAllFlags() {
        return flagService.getAllFlags();
    }

    @GetMapping("/{key}")
    public FeatureFlag getFlag(@PathVariable String key) {
        return flagService.getFlagByKey(key);
    }

    @PostMapping
    public FeatureFlag createFlag(@RequestBody FeatureFlag flag) {
        return flagService.createOrUpdateFlag(flag);
    }

    @PutMapping("/{key}")
    public FeatureFlag updateFlag(@PathVariable String key, @RequestBody FeatureFlag flag) {
        flag.setKey(key);
        return flagService.createOrUpdateFlag(flag);
    }

    @DeleteMapping("/{key}")
    public ResponseEntity<Void> deleteFlag(@PathVariable String key) {
        flagService.deleteFlag(key);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{key}/kill-switch")
    public FeatureFlag toggleKillSwitch(@PathVariable String key, @RequestParam boolean active) {
        FeatureFlag flag = flagService.getFlagByKey(key);
        flag.setKillSwitch(active);
        return flagService.createOrUpdateFlag(flag);
    }
}
