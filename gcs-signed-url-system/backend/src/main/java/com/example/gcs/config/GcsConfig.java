package com.example.gcs.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;

@Configuration
public class GcsConfig {

    @Value("${gcp.storage.credentials-path:}")
    private Resource credentialsResource;

    @Bean
    public Storage storage() throws IOException {
        if (credentialsResource != null && credentialsResource.exists()) {
            StorageOptions options = StorageOptions.newBuilder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsResource.getInputStream()))
                    .build();
            return options.getService();
        }
        // Fallback to default (Environment Variable: GOOGLE_APPLICATION_CREDENTIALS)
        return StorageOptions.getDefaultInstance().getService();
    }

}
