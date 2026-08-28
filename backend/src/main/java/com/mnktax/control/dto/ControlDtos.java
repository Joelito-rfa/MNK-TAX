package com.mnktax.control.dto;

import com.mnktax.control.entity.ControlDocument;
import com.mnktax.control.entity.ControlStatus;
import com.mnktax.control.entity.ControlType;
import com.mnktax.control.entity.TaxControl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ControlDtos {

    private ControlDtos() {
    }

    public record CreateControlRequest(
            @NotNull(message = "L'ID du contribuable est requis.") Long taxpayerId,
            @NotNull(message = "Le type de contrôle est requis.") ControlType controlType,
            @NotNull(message = "La date de début est requise.") LocalDate periodStart,
            @NotNull(message = "La date de fin est requise.") LocalDate periodEnd,
            @NotBlank(message = "Le motif est requis.") String reason,
            Long agentId,
            List<DocumentRequest> documents
    ) {
    }

    public record DocumentRequest(
            @NotBlank(message = "Le titre est requis.") String title,
            String documentType
    ) {
    }

    public record UpdateControlRequest(
            ControlStatus status,
            String observations,
            String anomalies,
            BigDecimal redressement,
            BigDecimal penaltyAmount
    ) {
    }

    public record TaxControlDto(
            Long id, String reference, Long taxpayerId, String nif, String taxpayerName,
            Long agentId, String agentName, ControlType controlType,
            LocalDate periodStart, LocalDate periodEnd, String reason,
            ControlStatus status, Instant startedAt, Instant completedAt,
            String observations, String anomalies,
            BigDecimal redressement, BigDecimal penaltyAmount,
            Long debtId,
            Instant createdAt, Instant updatedAt
    ) {
        public static TaxControlDto from(TaxControl tc, String agentName) {
            return new TaxControlDto(
                    tc.getId(), tc.getReference(),
                    tc.getTaxpayer().getId(), tc.getTaxpayer().getNif(), tc.getTaxpayer().getName(),
                    tc.getAgentId(), agentName, tc.getControlType(),
                    tc.getPeriodStart(), tc.getPeriodEnd(), tc.getReason(),
                    tc.getStatus(), tc.getStartedAt(), tc.getCompletedAt(),
                    tc.getObservations(), tc.getAnomalies(),
                    tc.getRedressement(), tc.getPenaltyAmount(),
                    tc.getDebt() != null ? tc.getDebt().getId() : null,
                    tc.getCreatedAt(), tc.getUpdatedAt()
            );
        }
    }

    public record ControlDocumentDto(
            Long id, String title, String documentType,
            Boolean requested, Boolean received, String notes
    ) {
        public static ControlDocumentDto from(ControlDocument d) {
            return new ControlDocumentDto(d.getId(), d.getTitle(), d.getDocumentType(),
                    d.getRequested(), d.getReceived(), d.getNotes());
        }
    }

    public record ControlDetailDto(
            TaxControlDto control,
            List<ControlDocumentDto> documents
    ) {
    }
}
