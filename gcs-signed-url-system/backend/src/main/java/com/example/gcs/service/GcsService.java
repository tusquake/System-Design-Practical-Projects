package com.example.gcs.service;

import com.example.gcs.model.FileMetadata;
import com.example.gcs.repository.FileMetadataRepository;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class GcsService {

    private final Storage storage;
    private final FileMetadataRepository metadataRepository;

    @Value("${gcp.storage.bucket-name}")
    private String bucketName;

    @Value("${gcp.storage.expiry-minutes:15}")
    private int expiryMinutes;

    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/png", "image/jpeg", "video/mp4", "application/pdf");

    public Map<String, String> generateUploadUrl(String fileName, String contentType) {
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported content type: " + contentType);
        }

        String uniqueFileName = UUID.randomUUID() + "-" + fileName;
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, uniqueFileName))
                .setContentType(contentType)
                .build();

        // Signed URLs with V4 require specific headers if they are to be validated
        Map<String, String> extensionHeaders = new HashMap<>();
        extensionHeaders.put("Content-Type", contentType);

        URL signedUrl = storage.signUrl(blobInfo,
                expiryMinutes, TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.PUT),
                Storage.SignUrlOption.withExtHeaders(extensionHeaders),
                Storage.SignUrlOption.withV4Signature());

        log.info("Generated signed upload URL for: {}", uniqueFileName);

        // Persist metadata to Database
        FileMetadata metadata = FileMetadata.builder()
                .originalFileName(fileName)
                .gcsFileName(uniqueFileName)
                .contentType(contentType)
                .build();
        metadataRepository.save(metadata);
        log.info("Saved metadata for file: {} in database", fileName);

        return Map.of(
                "uploadUrl", signedUrl.toString(),
                "fileName", uniqueFileName);
    }

    public String generateDownloadUrl(String fileName) {
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, fileName)).build();

        URL signedUrl = storage.signUrl(blobInfo,
                expiryMinutes, TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.GET),
                Storage.SignUrlOption.withV4Signature());

        log.info("Generated signed download URL for: {}", fileName);
        return signedUrl.toString();
    }

    public List<FileMetadata> getAllFiles() {
        return metadataRepository.findAll();
    }

    public String getFileSummary(String fileName) {
        String summaryPath = "summaries/" + fileName + ".txt";
        Blob blob = storage.get(bucketName, summaryPath);
        if (blob == null) {
            return "Summary not ready yet. Please wait a few seconds...";
        }
        return new String(blob.getContent());
    }

    /**
     * Generates a signed POST URL that the client uses to START a resumable session.
     * The response from GCS will contain a 'Location' header which is the actual Session URL.
     */
    public Map<String, String> createResumableSession(String fileName, String contentType) {
        String uniqueFileName = UUID.randomUUID() + "-" + fileName;
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, uniqueFileName))
                .setContentType(contentType)
                .build();

        Map<String, String> extensionHeaders = new HashMap<>();
        extensionHeaders.put("x-goog-resumable", "start");
        extensionHeaders.put("Content-Type", contentType);

        URL signedUrl = storage.signUrl(blobInfo,
                expiryMinutes, TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.POST),
                Storage.SignUrlOption.withExtHeaders(extensionHeaders),
                Storage.SignUrlOption.withV4Signature(),
                Storage.SignUrlOption.withQueryParams(Map.of("uploadType", "resumable")));

        // Save metadata early (status: PENDING)
        FileMetadata metadata = FileMetadata.builder()
                .originalFileName(fileName)
                .gcsFileName(uniqueFileName)
                .contentType(contentType)
                .build();
        metadataRepository.save(metadata);

        return Map.of(
                "initiateUrl", signedUrl.toString(),
                "fileName", uniqueFileName
        );
    }
}
