package com.mnktax.auth.dto;

import com.mnktax.auth.entity.RegistrationRequest;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

public record RegistrationRequestDto(
        Long id,
        @Schema(example = "RAKOTO Jean") String name,
        @Schema(example = "jean@example.mg") String email,
        @Schema(example = "DGI Antananarivo") String organization,
        @Schema(example = "Agent fiscal") String role,
        @Schema(example = "J'ai besoin d'un accès") String message,
        @Schema(example = "PENDING") String status,
        String reviewedBy,
        Instant reviewedAt,
        Instant createdAt
) {
    public static RegistrationRequestDto from(RegistrationRequest r) {
        return new RegistrationRequestDto(
                r.getId(),
                r.getName(),
                r.getEmail(),
                r.getOrganization(),
                r.getRole(),
                r.getMessage(),
                r.getStatus(),
                r.getReviewedBy(),
                r.getReviewedAt(),
                r.getCreatedAt()
        );
    }
}
