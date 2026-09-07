package com.mnktax.auth.dto;

import com.mnktax.auth.entity.RegistrationRequest;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

public record RegistrationRequestDto(
        Long id,
        @Schema(example = "REG-2026-000001") String reference,
        @Schema(example = "INDIVIDUAL") String requestType,
        @Schema(example = "RAKOTO") String lastName,
        @Schema(example = "Jean") String firstName,
        @Schema(example = "RAKOTO Jean") String name,
        @Schema(example = "jean@example.mg") String email,
        @Schema(example = "+261 34 00 000 00") String phone,
        @Schema(example = "0000409001") String nif,
        @Schema(example = "Antananarivo") String address,
        @Schema(example = "DGI Antananarivo") String organization,
        @Schema(example = "Agent fiscal") String position,
        @Schema(example = "Agent fiscal") String role,
        @Schema(example = "ANA-01") String taxCenter,
        @Schema(example = "J'ai besoin d'un accès") String message,
        @Schema(example = "PENDING") String status,
        String rejectionReason,
        String assignedTo,
        Instant assignedAt,
        String reviewedBy,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static RegistrationRequestDto from(RegistrationRequest r) {
        return new RegistrationRequestDto(
                r.getId(),
                r.getReference(),
                r.getRequestType(),
                r.getLastName(),
                r.getFirstName(),
                r.getName(),
                r.getEmail(),
                r.getPhone(),
                r.getNif(),
                r.getAddress(),
                r.getOrganization(),
                r.getPosition(),
                r.getRole(),
                r.getTaxCenter(),
                r.getMessage(),
                r.getStatus(),
                r.getRejectionReason(),
                r.getAssignedTo(),
                r.getAssignedAt(),
                r.getReviewedBy(),
                r.getReviewedAt(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
