package com.vortex.controller;

import com.vortex.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PlatformController {

    private final LeaderboardService leaderboardService;
    private final AnalyticsService analyticsService;
    private final TournamentService tournamentService;
    private final EventStreamService eventStreamService;
    private final SearchService searchService;

    // --- Leaderboard ---
    @PostMapping("/scores")
    public void updateScore(@RequestParam String playerId, @RequestParam double score) {
        leaderboardService.updateScore(playerId, score);
        analyticsService.trackLogin(Math.abs(playerId.hashCode() % 1000)); // Mocking userId
        eventStreamService.publishMatchResult(playerId, (int) score);
    }

    @GetMapping("/leaderboard")
    public Set<?> getLeaderboard(@RequestParam(defaultValue = "10") int limit) {
        return leaderboardService.getTopPlayers(limit);
    }

    // --- Analytics ---
    @GetMapping("/analytics/active-users")
    public Long getActiveUsers() {
        return analyticsService.getDailyActiveUsersCount();
    }

    @GetMapping("/analytics/viewers/{tournamentId}")
    public Long getViewers(@PathVariable String tournamentId) {
        return analyticsService.getUniqueViewerCount(tournamentId);
    }

    @PostMapping("/analytics/viewers/{tournamentId}")
    public void trackViewer(@PathVariable String tournamentId, @RequestParam String viewerId) {
        analyticsService.trackUniqueViewer(tournamentId, viewerId);
    }

    // --- Tournament ---
    @PostMapping("/tournaments/{tournamentId}/join")
    public Map<String, Object> join(@PathVariable String tournamentId, @RequestParam String playerId) {
        boolean success = tournamentService.joinTournament(tournamentId, playerId);
        return Map.of("success", success, "message", success ? "Joined!" : "Failed - No slots or Error");
    }

    @PostMapping("/tournaments/{tournamentId}/init")
    public void initTournament(@PathVariable String tournamentId, @RequestParam int slots) {
        tournamentService.initializeSlots(tournamentId, slots);
    }

    // --- Autocomplete ---
    @PostMapping("/search/players")
    public void registerPlayer(@RequestParam String name) {
        searchService.addPlayerToSearch(name);
    }

    @GetMapping("/search/suggest")
    public Set<Object> suggest(@RequestParam String prefix) {
        return searchService.suggest(prefix);
    }
}
