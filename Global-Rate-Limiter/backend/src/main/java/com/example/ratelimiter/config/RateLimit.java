package com.example.ratelimiter.config;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int capacity() default 10;
    double refillRate() default 1.0; // Tokens per second
}
