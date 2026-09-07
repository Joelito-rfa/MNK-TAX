package com.mnktax.paymentplan.dto;

import com.mnktax.paymentplan.entity.InstallmentStatus;
import com.mnktax.paymentplan.entity.PaymentPlan;
import com.mnktax.paymentplan.entity.PaymentPlanInstallment;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class PaymentPlanDtos {

    private PaymentPlanDtos() {
    }

    // ── Requêtes ─────────────────────────────────────────────

    public record InstallmentRequest(
            @NotNull(message = "La date de la tranche est requise.") LocalDate dueDate,
            @NotNull(message = "Le montant de la tranche est requis.")
            @DecimalMin(value = "0.01", message = "Le montant d'une tranche doit être positif.") BigDecimal amount
    ) {
    }

    public record CreatePlanRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotBlank(message = "L'intitulé de l'échéancier est requis.") String label,
            String notes,
            @Valid @NotEmpty(message = "Au moins une tranche est requise.") List<InstallmentRequest> installments
    ) {
    }

    public record CancelPlanRequest(String reason) {
    }

    // ── Réponses ─────────────────────────────────────────────

    public record InstallmentDto(
            Long id,
            Integer number,
            LocalDate dueDate,
            BigDecimal amount,
            BigDecimal paidAmount,
            BigDecimal remainingAmount,
            InstallmentStatus status,
            Instant paidAt,
            long daysOverdue
    ) {
        public static InstallmentDto from(PaymentPlanInstallment i) {
            long daysOverdue = 0;
            boolean unpaid = i.getStatus() == InstallmentStatus.PENDING
                    || i.getStatus() == InstallmentStatus.PARTIALLY_PAID;
            if (i.getStatus() == InstallmentStatus.OVERDUE
                    || (unpaid && i.getDueDate().isBefore(LocalDate.now()))) {
                daysOverdue = Math.max(0,
                        java.time.temporal.ChronoUnit.DAYS.between(i.getDueDate(), LocalDate.now()));
            }
            return new InstallmentDto(i.getId(), i.getInstallmentNumber(), i.getDueDate(), i.getAmount(),
                    i.getPaidAmount(), i.getAmount().subtract(i.getPaidAmount()), i.getStatus(),
                    i.getPaidAt(), daysOverdue);
        }
    }

    public record PlanStatsDto(
            long activePlans,
            long completedPlans,
            long cancelledPlans,
            long overdueInstallments,
            long plansWithOverdue
    ) {
    }

    public record PlanDto(
            Long id,
            String reference,
            String label,
            Long debtId,
            String debtReference,
            String nif,
            String taxpayerName,
            PaymentPlanStatus status,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal remainingAmount,
            int installmentCount,
            int paidInstallments,
            int overdueInstallments,
            LocalDate nextDueDate,
            String notes,
            String createdBy,
            Instant createdAt,
            List<InstallmentDto> installments
    ) {
        public static PlanDto from(PaymentPlan p) {
            BigDecimal paid = p.getInstallments().stream()
                    .map(PaymentPlanInstallment::getPaidAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long paidCount = p.getInstallments().stream()
                    .filter(i -> i.getStatus() == InstallmentStatus.PAID).count();
            long overdueCount = p.getInstallments().stream()
                    .filter(i -> i.getStatus() == InstallmentStatus.OVERDUE).count();
            LocalDate nextDue = p.getInstallments().stream()
                    .filter(i -> i.getStatus() == InstallmentStatus.PENDING
                            || i.getStatus() == InstallmentStatus.PARTIALLY_PAID)
                    .map(PaymentPlanInstallment::getDueDate)
                    .min(LocalDate::compareTo)
                    .orElse(null);

            return new PlanDto(p.getId(), p.getReference(), p.getLabel(),
                    p.getDebt().getId(), p.getDebt().getReference(),
                    p.getDebt().getTaxpayer().getNif(), p.getDebt().getTaxpayer().getName(),
                    p.getStatus(), p.getTotalAmount(), paid,
                    p.getTotalAmount().subtract(paid),
                    p.getInstallments().size(), (int) paidCount, (int) overdueCount,
                    nextDue, p.getNotes(), p.getCreatedBy(), p.getCreatedAt(),
                    p.getInstallments().stream().map(InstallmentDto::from).toList());
        }
    }
}
