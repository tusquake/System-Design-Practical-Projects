package com.ffplatform.webhookservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.retry.annotation.EnableRetry;

@SpringBootApplication
@EnableRetry
public class WebhookServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(WebhookServiceApplication.class, args);
    }
}
