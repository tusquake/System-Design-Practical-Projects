package com.example.graph.controller;

import com.example.graph.model.User;
import com.example.graph.model.Interest;
import com.example.graph.repository.UserRepository;
import com.example.graph.repository.InterestRepository;
import com.example.graph.service.PubSubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/graph")
@CrossOrigin(origins = "*")
public class GraphController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InterestRepository interestRepository;

    @Autowired
    private PubSubService pubSubService;

    // --- Async Ingestion (GCP Pub/Sub) ---

    @PostMapping("/async/follow")
    public String followAsync(@RequestParam String follower, @RequestParam String followed) {
        pubSubService.publishGraphEvent("FOLLOW", Map.of("follower", follower, "followed", followed));
        return "Accepted: Follow event sent to queue (Pub/Sub)";
    }

    @PostMapping("/async/like")
    public String likeAsync(@RequestParam String username, @RequestParam String interestName) {
        pubSubService.publishGraphEvent("LIKE", Map.of("username", username, "interestName", interestName));
        return "Accepted: Like event sent to queue (Pub/Sub)";
    }

    // --- Ingestion APIs ---

    @PostMapping("/users")
    public User createUser(@RequestBody User user) {
        return userRepository.save(user);
    }

    @PostMapping("/interests")
    public Interest createInterest(@RequestBody Interest interest) {
        return interestRepository.save(interest);
    }

    @PostMapping("/follow")
    public String follow(@RequestParam String follower, @RequestParam String followed) {
        User u1 = userRepository.findById(follower)
                .orElseThrow(() -> new RuntimeException("Follower not found: " + follower));
        User u2 = userRepository.findById(followed)
                .orElseThrow(() -> new RuntimeException("Followed user not found: " + followed));
        u1.follow(u2);
        userRepository.save(u1);
        return "Success: " + follower + " now follows " + followed;
    }

    @PostMapping("/like")
    public String like(@RequestParam String username, @RequestParam String interestName) {
        User u = userRepository.findById(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        Interest i = interestRepository.findById(interestName)
                .orElseThrow(() -> new RuntimeException("Interest not found: " + interestName));
        u.like(i);
        userRepository.save(u);
        return "Success: " + username + " now likes " + interestName;
    }

    // --- Intelligence APIs (The "System Design" part) ---

    @GetMapping("/recommend/friends/{username}")
    public List<User> getPeopleYouMayKnow(@PathVariable String username) {
        return userRepository.findPeopleYouMayKnow(username);
    }

    @GetMapping("/recommend/interests/{username}")
    public List<String> getRecommendedInterests(@PathVariable String username) {
        return userRepository.recommendInterests(username);
    }

    @GetMapping("/fraud/bot-rings")
    public List<User> detectBotRings() {
        return userRepository.detectPotentialBotRings();
    }

    // --- Visualization API ---

    @GetMapping("/all")
    public List<User> getAllNodes() {
        return userRepository.findAll();
    }
}
