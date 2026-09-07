package com.mnktax.auth.dto;

import com.mnktax.auth.entity.RefreshToken;

import java.time.Instant;

public record SessionDto(
        Long id,
        String userAgent,
        String ipAddress,
        boolean current,
        Instant createdAt,
        Instant expiresAt
) {

    public static SessionDto from(RefreshToken token, Long currentTokenId) {
        return new SessionDto(
                token.getId(),
                token.getUserAgent(),
                token.getIpAddress(),
                token.getId().equals(currentTokenId),
                token.getCreatedAt(),
                token.getExpiresAt()
        );
    }
}
