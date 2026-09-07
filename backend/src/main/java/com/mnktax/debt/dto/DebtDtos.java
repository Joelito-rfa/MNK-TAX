package com.mnktax.debt.dto;

import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtItem;
import com.mnktax.debt.entity.DebtOrigin;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public final class DebtDtos {

    private DebtDtos() {
    }

    public record DebtItemDto(Long id, DebtItem.Kind kind, String label, BigDecimal amount) {
        public static DebtItemDto from(DebtItem item) {
            return new DebtItemDto(item.getId(), item.getKind(), item.getLabel(), item.getAmount());
        }
    }

    public record DebtHistoryDto(Long id, String eventType, String description, String oldValue,
                                 String newValue, String performedBy, Instant eventDate, Instant createdAt) {
        public static DebtHistoryDto from(DebtHistory h) {
            return new DebtHistoryDto(h.getId(), h.getEventType(), h.getDescription(),
                    h.getOldValue(), h.getNewValue(), h.getPerformedBy(), h.getEventDate(), h.getCreatedAt());
        }
    }

    public record DebtStatsDto(long totalDebts, long activeDebts, long overdueDebts, long paidDebts,
                               long inCollectionDebts, long disputedDebts, long suspendedDebts,
                               BigDecimal totalAmount, BigDecimal totalOutstanding, BigDecimal totalPaid,
                               BigDecimal overdueBalance, double collectionRate,
                               List<OriginCount> byOrigin, List<PriorityCount> byPriority,
                               List<TaxTypeCount> byTaxType) {
        public record OriginCount(String origin, long count) {}
        public record PriorityCount(String priority, long count) {}
        public record TaxTypeCount(String taxType, long count) {}
    }

    public record MarkOverdueResult(int updated, List<String> details) {}

    public record TaxDebtDto(Long id, String reference, Long taxpayerId, String nif, String taxpayerName,
                             Long assessmentId, String assessmentReference, Long taxTypeId, String taxTypeCode,
                             String period, BigDecimal principalAmount, BigDecimal penaltyAmount,
                             BigDecimal interestAmount, BigDecimal adjustmentsAmount, BigDecimal creditsAmount,
                             BigDecimal totalAmount, BigDecimal paidAmount, BigDecimal balance,
                             LocalDate issueDate, LocalDate dueDate, DebtStatus status, Instant closedAt,
                             String origin, DebtCollectionPriority collectionPriority, String observations,
                             String createdBy, String taxpayerCenter, Instant suspendedAt,
                             long daysOverdue, List<DebtItemDto> items) {

        public static TaxDebtDto from(TaxDebt d, List<DebtItem> items) {
            LocalDate now = LocalDate.now();
            long days = 0;
            if (d.getStatus() == DebtStatus.OVERDUE || d.getStatus() == DebtStatus.IN_COLLECTION
                    || (d.getBalance().signum() > 0 && d.getDueDate().isBefore(now))) {
                days = ChronoUnit.DAYS.between(d.getDueDate(), now);
            }
            Long assessmentId = null;
            String assessmentReference = null;
            if (d.getAssessment() != null) {
                assessmentId = d.getAssessment().getId();
                assessmentReference = d.getAssessment().getReference();
            }
            Long taxTypeId = null;
            String taxTypeCode = null;
            if (d.getTaxType() != null) {
                taxTypeId = d.getTaxType().getId();
                taxTypeCode = d.getTaxType().getCode();
            }
            return new TaxDebtDto(d.getId(), d.getReference(), d.getTaxpayer().getId(),
                    d.getTaxpayer().getNif(), d.getTaxpayer().getName(),
                    assessmentId, assessmentReference,
                    taxTypeId, taxTypeCode,
                    d.getPeriod(), d.getPrincipalAmount(), d.getPenaltyAmount(), d.getInterestAmount(),
                    d.getAdjustmentsAmount(), d.getCreditsAmount(), d.getTotalAmount(), d.getPaidAmount(),
                    d.getBalance(), d.getIssueDate(), d.getDueDate(), d.getStatus(), d.getClosedAt(),
                    d.getOrigin() != null ? d.getOrigin().name() : DebtOrigin.ASSESSMENT.name(),
                    d.getCollectionPriority() != null ? d.getCollectionPriority() : DebtCollectionPriority.NORMAL,
                    d.getObservations(), d.getCreatedBy(), d.getTaxpayerCenter(), d.getSuspendedAt(),
                    days, items.stream().map(DebtItemDto::from).toList());
        }
    }
}
