package com.mnktax.complaint.dto;

import com.mnktax.complaint.entity.Complaint;
import com.mnktax.complaint.entity.ComplaintResponse;
import com.mnktax.complaint.entity.ComplaintStatus;
import com.mnktax.complaint.entity.ContextType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public final class ComplaintDtos {

    private ComplaintDtos() {
    }

    public record CreateComplaintRequest(
            @NotNull(message = "L'ID du contribuable est requis.") Long taxpayerId,
            @NotBlank(message = "L'objet est requis.") String subject,
            @NotBlank(message = "La description est requise.") String description,
            @NotNull(message = "Le contexte est requis.") ContextType contextType,
            String contextRef,
            Long declarationId,
            Long debtId,
            Long paymentId,
            Long controlId
    ) {
    }

    public record UpdateComplaintRequest(
            ComplaintStatus status,
            String resolution,
            Long assignedTo
    ) {
    }

    public record AddResponseRequest(
            @NotBlank(message = "Le contenu est requis.") String content
    ) {
    }

    public record ComplaintDto(
            Long id, String reference, Long taxpayerId, String nif, String taxpayerName,
            String subject, String description,
            ContextType contextType, String contextRef,
            Long declarationId, Long debtId, Long paymentId, Long controlId, Long refundId,
            ComplaintStatus status, Long assignedTo,
            String resolution, Instant resolvedAt, Instant closedAt,
            Instant createdAt, Instant updatedAt
    ) {
        public static ComplaintDto from(Complaint c) {
            return new ComplaintDto(
                    c.getId(), c.getReference(),
                    c.getTaxpayer().getId(), c.getTaxpayer().getNif(), c.getTaxpayer().getName(),
                    c.getSubject(), c.getDescription(),
                    c.getContextType(), c.getContextRef(),
                    c.getDeclarationId(), c.getDebtId(), c.getPaymentId(),
                    c.getControlId(), c.getRefundId(),
                    c.getStatus(), c.getAssignedTo(),
                    c.getResolution(), c.getResolvedAt(), c.getClosedAt(),
                    c.getCreatedAt(), c.getUpdatedAt()
            );
        }
    }

    public record ComplaintResponseDto(
            Long id, Long authorId, String authorName, String content, Instant createdAt
    ) {
        public static ComplaintResponseDto from(ComplaintResponse r) {
            return new ComplaintResponseDto(r.getId(), r.getAuthorId(), r.getAuthorName(),
                    r.getContent(), r.getCreatedAt());
        }
    }

    public record ComplaintDetailDto(
            ComplaintDto complaint,
            List<ComplaintResponseDto> responses
    ) {
    }

    public record ComplaintStatsDto(
            long total,
            long open,
            long underReview,
            long accepted,
            long rejected,
            long closed
    ) {
    }
}
