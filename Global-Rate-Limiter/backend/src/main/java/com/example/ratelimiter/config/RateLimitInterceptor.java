package com.example.ratelimiter.config;

import com.example.ratelimiter.service.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Autowired
    private RateLimiterService rateLimiterService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (handler instanceof HandlerMethod) {
            HandlerMethod handlerMethod = (HandlerMethod) handler;
            RateLimit rateLimit = handlerMethod.getMethodAnnotation(RateLimit.class);

            if (rateLimit != null) {
                // We use IP address as the ClientID for this demo
                String clientId = request.getRemoteAddr();
                System.out.println("Interceptor triggered for: " + clientId);
                
                boolean allowed = rateLimiterService.isAllowed(
                    clientId, 
                    rateLimit.capacity(), 
                    rateLimit.refillRate()
                );

                if (!allowed) {
                    response.setStatus(429); // Too Many Requests
                    response.getWriter().write("Error: Rate limit exceeded. Try again later.");
                    return false; // Block the request!
                }
            }
        }
        return true; // Allow the request
    }
}
