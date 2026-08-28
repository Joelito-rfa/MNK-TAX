package com.mnktax.payment.dto;

import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.entity.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class PaymentDtos {

    private PaymentDtos() {
    }

    public record AllocationRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotNull(message = "Le montant à affecter est requis.") @Positive BigDecimal amount,
            String comment
    ) {
    }

    public record CreatePaymentRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotNull(message = "Le montant est requis.") @Positive(message = "Le montant doit être strictement positif.") BigDecimal amount,
            @NotNull(message = "La date de paiement est requise.") LocalDate paymentDate,
            @NotNull(message = "Le mode de paiement est requis.") PaymentMethod method,
            String transactionReference,
            String observations,
            Long declarationId,
            List<AllocationRequest> allocations
    ) {
    }

    public record AllocationDto(
            Long id,
            Long debtId,
            String debtReference,
            BigDecimal amount,
            PaymentAllocation.Component component,
            Instant allocatedAt,
            String createdBy,
            String comment
    ) {
        public static AllocationDto from(PaymentAllocation a) {
            return new AllocationDto(a.getId(), a.getDebt().getId(), a.getDebt().getReference(),
                    a.getAmount(), a.getComponent(), a.getAllocatedAt(), a.getCreatedBy(), a.getComment());
        }
    }

    public record PaymentDto(
            Long id,
            String reference,
            Long taxpayerId,
            String nif,
            String taxpayerName,
            Long debtId,
            String debtReference,
            Long declarationId,
            String declarationReference,
            LocalDate paymentDate,
            BigDecimal amount,
            String currency,
            PaymentMethod method,
            String transactionReference,
            PaymentStatus status,
            BigDecimal allocatedAmount,
            BigDecimal unpaidAmount,
            String rejectionReason,
            String observations,
            String createdBy,
            Instant recordedAt,
            String receiptReference,
            List<AllocationDto> allocationDetails
    ) {
        public static PaymentDto from(Payment p, String receiptReference, List<PaymentAllocation> allocs) {
            String debtRef = p.getDebt() != null ? p.getDebt().getReference() : null;
            Long declId = p.getDeclaration() != null ? p.getDeclaration().getId() : null;
            String declRef = p.getDeclaration() != null ? p.getDeclaration().getReference() : null;
            List<AllocationDto> allocDtos = allocs != null
                    ? allocs.stream().map(AllocationDto::from).toList()
                    : List.of();
            return new PaymentDto(p.getId(), p.getReference(), p.getTaxpayer().getId(),
                    p.getTaxpayer().getNif(), p.getTaxpayer().getName(),
                    p.getDebt() != null ? p.getDebt().getId() : null, debtRef,
                    declId, declRef,
                    p.getPaymentDate(), p.getAmount(), p.getCurrency(),
                    p.getMethod(), p.getTransactionReference(),
                    p.getStatus(), p.getAllocatedAmount(), p.getUnpaidAmount(),
                    p.getRejectionReason(), p.getObservations(),
                    p.getCreatedBy(), p.getRecordedAt(), receiptReference, allocDtos);
        }
    }

    public record PaymentStatsDto(
            long todayCount,
            long monthCount,
            BigDecimal monthAmount,
            BigDecimal unallocatedAmount,
            long pendingCount,
            long rejectedCount,
            long allocatedCount,
            long cancelledCount,
            long partiallyAllocatedCount
    ) {
    }

    public record CancelPaymentRequest(
            @NotNull(message = "Le motif est requis.") String reason
    ) {
    }

    public record ConfirmPaymentRequest(
    ) {
    }

    public record ReconcileResult(
            boolean consistent,
            BigDecimal paymentAmount,
            BigDecimal allocationSum,
            BigDecimal unpaidAmount,
            List<String> issues
    ) {
    }
}
