package com.mnktax.payment.dto;

import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.entity.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class PaymentDtos {

    private PaymentDtos() {
    }

    public record AllocationRequest(
            @NotNull(message = "Le montant à affecter au principal est requis.") @Positive BigDecimal principal,
            BigDecimal penalty,
            BigDecimal interest
    ) {
    }

    public record CreatePaymentRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotNull(message = "Le montant est requis.") @Positive(message = "Le montant doit être strictement positif.") BigDecimal amount,
            @NotNull(message = "La date de paiement est requise.") LocalDate paymentDate,
            @NotNull(message = "Le mode de paiement est requis.") PaymentMethod method,
            AllocationRequest allocations
    ) {
    }

    public record PaymentDto(Long id, String reference, Long taxpayerId, String nif, String taxpayerName,
                             LocalDate paymentDate, BigDecimal amount, PaymentMethod method, PaymentStatus status,
                             BigDecimal allocatedAmount, String rejectionReason, String createdBy,
                             Instant recordedAt, String receiptReference) {
        public static PaymentDto from(Payment p, String receiptReference) {
            return new PaymentDto(p.getId(), p.getReference(), p.getTaxpayer().getId(),
                    p.getTaxpayer().getNif(), p.getTaxpayer().getName(), p.getPaymentDate(), p.getAmount(),
                    p.getMethod(), p.getStatus(), p.getAllocatedAmount(), p.getRejectionReason(),
                    p.getCreatedBy(), p.getRecordedAt(), receiptReference);
        }
    }
}
