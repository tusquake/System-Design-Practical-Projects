package com.example.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationRequest {
    private String recipient;    // Email, Phone Number, or Device Token
    private String content;      // The message body
    private String subject;      // Optional (for emails)
    private String sender;       // Optional
}
