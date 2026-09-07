package com.mnktax.auth.dto;

import com.mnktax.audit.entity.AuditLog;

import java.time.Instant;

public record SecurityEventDto(
        Long id,
        String action,
        String entityType,
        String ipAddress,
        String userAgent,
        Instant createdAt
) {

    public static SecurityEventDto from(AuditLog log) {
        return new SecurityEventDto(
                log.getId(),
                log.getAction(),
                log.getEntityType(),
                log.getIpAddress(),
                log.getUserAgent(),
                log.getCreatedAt()
        );
    }
}
