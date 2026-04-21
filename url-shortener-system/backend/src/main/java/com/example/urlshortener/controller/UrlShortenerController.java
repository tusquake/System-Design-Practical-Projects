package com.example.urlshortener.controller;

import com.example.urlshortener.service.UrlShortenerService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UrlShortenerController {

    private final UrlShortenerService service;

    @PostMapping("/api/v1/shorten")
    public ResponseEntity<Map<String, String>> shortenUrl(@RequestBody Map<String, String> request) {
        String longUrl = request.get("longUrl");
        if (longUrl == null || longUrl.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        String shortCode = service.shortenUrl(longUrl);
        return ResponseEntity.ok(Map.of("shortCode", shortCode));
    }

    @GetMapping("/{shortCode}")
    public void redirectToLongUrl(@PathVariable String shortCode, HttpServletResponse response) throws IOException {
        String longUrl = service.getLongUrl(shortCode);
        
        if (longUrl != null) {
            response.sendRedirect(longUrl);
        } else {
            response.sendError(HttpStatus.NOT_FOUND.value(), "Short URL not found");
        }
    }
}
