package com.mnktax.common.web;

import com.mnktax.common.exception.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class RateLimitInterceptor implements HandlerInterceptor {

    private static final long WINDOW_MS = 60_000L;

    private final int requestsPerMinute;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitInterceptor(int requestsPerMinute) {
        this.requestsPerMinute = requestsPerMinute;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        String key = clientKey(request);
        long now = System.currentTimeMillis();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.start.get() >= WINDOW_MS) {
                return new Window(now);
            }
            return existing;
        });
        if (!window.accept(requestsPerMinute)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiError error = ApiError.of(429, "RATE_LIMITED", "Trop de requêtes. Réessayez plus tard.",
                    request.getRequestURI());
            response.getWriter().write(objectMapper.writeValueAsString(error));
            return false;
        }
        return true;
    }

    private String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static final class Window {
        private final AtomicLong start;
        private final AtomicInteger count = new AtomicInteger();

        private Window(long start) {
            this.start = new AtomicLong(start);
        }

        boolean accept(int limit) {
            return count.incrementAndGet() <= limit;
        }
    }
}
