package com.mnktax.debt.dto;

import com.mnktax.debt.entity.DebtItem;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class DebtDtos {

    private DebtDtos() {
    }

    public record DebtItemDto(Long id, DebtItem.Kind kind, String label, BigDecimal amount) {
        public static DebtItemDto from(DebtItem item) {
            return new DebtItemDto(item.getId(), item.getKind(), item.getLabel(), item.getAmount());
        }
    }

    public record TaxDebtDto(Long id, String reference, Long taxpayerId, String nif, String taxpayerName,
                             Long assessmentId, String assessmentReference, Long taxTypeId, String taxTypeCode,
                             String period, BigDecimal principalAmount, BigDecimal penaltyAmount,
                             BigDecimal interestAmount, BigDecimal adjustmentsAmount, BigDecimal creditsAmount,
                             BigDecimal totalAmount, BigDecimal paidAmount, BigDecimal balance,
                             LocalDate issueDate, LocalDate dueDate, DebtStatus status, Instant closedAt,
                             Instant createdAt, List<DebtItemDto> items) {

        public static TaxDebtDto from(TaxDebt d, List<DebtItem> items) {
            return new TaxDebtDto(d.getId(), d.getReference(), d.getTaxpayer().getId(),
                    d.getTaxpayer().getNif(), d.getTaxpayer().getName(),
                    d.getAssessment().getId(), d.getAssessment().getReference(),
                    d.getTaxType().getId(), d.getTaxType().getCode(),
                    d.getPeriod(), d.getPrincipalAmount(), d.getPenaltyAmount(), d.getInterestAmount(),
                    d.getAdjustmentsAmount(), d.getCreditsAmount(), d.getTotalAmount(), d.getPaidAmount(),
                    d.getBalance(), d.getIssueDate(), d.getDueDate(), d.getStatus(), d.getClosedAt(),
                    d.getCreatedAt(), items.stream().map(DebtItemDto::from).toList());
        }
    }
}
