package com.mnktax.refund.dto;

import com.mnktax.refund.entity.Refund;
import com.mnktax.refund.entity.RefundReason;
import com.mnktax.refund.entity.RefundStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;

public final class RefundDtos {

    private RefundDtos() {
    }

    public record CreateRefundRequest(
            @NotNull(message = "L'ID du contribuable est requis.") Long taxpayerId,
            @NotNull(message = "Le motif est requis.") RefundReason reason,
            String description,
            Long debtId,
            Long declarationId,
            @NotNull(message = "Le montant est requis.") @Positive(message = "Le montant doit être positif.") BigDecimal amount
    ) {
    }

    public record UpdateRefundRequest(
            RefundReason reason,
            String description,
            @Positive(message = "Le montant doit être positif.") BigDecimal amount
    ) {
    }

    public record ReviewRefundRequest(
            @NotNull(message = "La décision est requise.") Boolean approve,
            BigDecimal approvedAmount,
            String rejectionReason
    ) {
    }

    public record PayRefundRequest(
            @NotNull(message = "Le mode de paiement est requis.") String paymentMethod,
            String paymentReference
    ) {
    }

    public record RefundDto(
            Long id, String reference, Long taxpayerId, String nif, String taxpayerName,
            RefundReason reason, String description,
            Long debtId, Long declarationId,
            BigDecimal amount, RefundStatus status,
            String requestedBy, String reviewedBy, Instant reviewedAt,
            BigDecimal approvedAmount,
            String paymentMethod, String paymentReference, Instant paidAt,
            String rejectionReason,
            Instant createdAt, Instant updatedAt
    ) {
        public static RefundDto from(Refund r) {
            return new RefundDto(
                    r.getId(), r.getReference(),
                    r.getTaxpayer().getId(), r.getTaxpayer().getNif(), r.getTaxpayer().getName(),
                    r.getReason(), r.getDescription(),
                    r.getDebtId(), r.getDeclarationId(),
                    r.getAmount(), r.getStatus(),
                    r.getRequestedBy(), r.getReviewedBy(), r.getReviewedAt(),
                    r.getApprovedAmount(),
                    r.getPaymentMethod(), r.getPaymentReference(), r.getPaidAt(),
                    r.getRejectionReason(),
                    r.getCreatedAt(), r.getUpdatedAt()
            );
        }
    }

    public record RefundStatsDto(
            long total,
            long pending,
            long underReview,
            long approved,
            long rejected,
            long paid
    ) {
    }
}
