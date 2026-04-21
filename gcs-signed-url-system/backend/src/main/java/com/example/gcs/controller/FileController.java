package com.example.gcs.controller;

import com.example.gcs.service.GcsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileController {

    private final GcsService gcsService;

    @GetMapping("/upload-url")
    public ResponseEntity<Map<String, String>> getUploadUrl(
            @RequestParam String fileName,
            @RequestParam String contentType) {
        return ResponseEntity.ok(gcsService.generateUploadUrl(fileName, contentType));
    }

    @GetMapping("/download-url")
    public ResponseEntity<Map<String, String>> getDownloadUrl(@RequestParam String fileName) {
        String url = gcsService.generateDownloadUrl(fileName);
        return ResponseEntity.ok(Map.of("downloadUrl", url));
    }

    @GetMapping
    public ResponseEntity<java.util.List<com.example.gcs.model.FileMetadata>> getAllFile() {
        return ResponseEntity.ok(gcsService.getAllFiles());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, String>> getSummary(@RequestParam String fileName) {
        String summary = gcsService.getFileSummary(fileName);
        return ResponseEntity.ok(Map.of("summary", summary));
    }
}
