package com.mnktax.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.audit.entity.AuditLog;
import com.mnktax.audit.repository.AuditLogRepository;
import com.mnktax.common.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Async
    public void record(String action, String entityType, String entityId, Object oldValue, Object newValue,
                       HttpServletRequest request) {
        try {
            AuditLog entry = AuditLog.builder()
                    .userId(SecurityUtils.currentUserId())
                    .username(SecurityUtils.currentUsername())
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .oldValue(toJson(oldValue))
                    .newValue(toJson(newValue))
                    .ipAddress(request == null ? null : clientIp(request))
                    .userAgent(request == null ? null : truncate(request.getHeader("User-Agent"), 255))
                    .createdAt(Instant.now())
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Impossible d'enregistrer l'audit pour {} {}", entityType, entityId, ex);
        }
    }

    public void record(String action, String entityType, String entityId, Object oldValue, Object newValue) {
        record(action, entityType, entityId, oldValue, newValue, null);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String s) {
            return truncate(s, 4000);
        }
        try {
            return truncate(objectMapper.writeValueAsString(value), 4000);
        } catch (Exception ex) {
            return truncate(String.valueOf(value), 4000);
        }
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return Optional.ofNullable(request.getRemoteAddr()).orElse("unknown");
    }
}
