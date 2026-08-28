package com.mnktax.collection.dto;

import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.entity.CollectionNotice;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public final class CollectionDtos {

    private CollectionDtos() {
    }

    // ── Requests ─────────────────────────────────────────────

    public record CreateActionRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotNull(message = "Le type d'action est requis.") CollectionActionType type,
            @NotBlank(message = "La description est requise.") String description,
            @NotNull(message = "La date d'action est requise.") LocalDate actionDate,
            String outcome,
            String nextAction,
            LocalDate nextActionDate
    ) {
    }

    public record CreateNoticeRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotBlank(message = "Le type de mise en demeure est requis.") String noticeType,
            String content
    ) {
    }

    public record RegisterPaymentRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotNull(message = "Le montant est requis.") @Positive(message = "Le montant doit être positif.") BigDecimal amount,
            @NotNull(message = "La date de paiement est requise.") LocalDate paymentDate,
            @NotBlank(message = "Le mode de paiement est requis.") String method
    ) {
    }

    // ── Response DTOs ────────────────────────────────────────

    public record CollectionActionDto(Long id, Long debtId, String debtReference, String nif, String taxpayerName,
                                      CollectionActionType type, String description, LocalDate actionDate,
                                      String outcome, Long responsibleUserId, String responsibleName,
                                      String status, String nextAction, LocalDate nextActionDate,
                                      Instant createdAt) {
        public static CollectionActionDto from(CollectionAction a) {
            return new CollectionActionDto(a.getId(), a.getDebt().getId(), a.getDebt().getReference(),
                    a.getDebt().getTaxpayer().getNif(), a.getDebt().getTaxpayer().getName(),
                    a.getType(), a.getDescription(), a.getActionDate(), a.getOutcome(),
                    a.getResponsibleUserId(), null, a.getStatus(),
                    a.getNextAction(), a.getNextActionDate(),
                    a.getCreatedAt());
        }
    }

    public record CollectionNoticeDto(Long id, Long debtId, String debtReference, String noticeNumber,
                                      LocalDate noticeDate, String noticeType, String content,
                                      Instant sentAt, String status, Instant createdAt) {
        public static CollectionNoticeDto from(CollectionNotice n) {
            return new CollectionNoticeDto(n.getId(), n.getDebt().getId(), n.getDebt().getReference(),
                    n.getNoticeNumber(), n.getNoticeDate(), n.getNoticeType(), n.getContent(),
                    n.getSentAt(), n.getStatus(), n.getCreatedAt());
        }
    }

    public record CollectionHistoryDto(List<CollectionActionDto> actions, List<CollectionNoticeDto> notices) {
    }

    // ── Collection debt row for the main table ───────────────

    public record CollectionDebtRowDto(
            Long id,
            String reference,
            String nif,
            String taxpayerName,
            String taxTypeCode,
            String period,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal balance,
            LocalDate dueDate,
            String debtStatus,
            String collectionStatus,
            String lastAction,
            LocalDate lastActionDate,
            String nextAction,
            LocalDate nextActionDate
    ) {
        public static CollectionDebtRowDto from(TaxDebt debt,
                                                 String lastActionDesc,
                                                 LocalDate lastActionDt,
                                                 String nextAct,
                                                 LocalDate nextActDt) {
            return new CollectionDebtRowDto(
                    debt.getId(),
                    debt.getReference(),
                    debt.getTaxpayer().getNif(),
                    debt.getTaxpayer().getName(),
                    debt.getTaxType().getCode(),
                    debt.getPeriod(),
                    debt.getTotalAmount(),
                    debt.getPaidAmount(),
                    debt.getBalance(),
                    debt.getDueDate(),
                    debt.getStatus().name(),
                    resolveCollectionStatus(debt),
                    lastActionDesc,
                    lastActionDt,
                    nextAct,
                    nextActDt
            );
        }

    }

    private static String resolveCollectionStatus(TaxDebt debt) {
        if (debt.getStatus() == DebtStatus.PAID) return "PAYE";
        if (debt.getStatus() == DebtStatus.CANCELLED) return "ANNULE";

        boolean isOverdue = debt.getDueDate().isBefore(LocalDate.now());
        boolean hasNotice = debt.getStatus() == DebtStatus.IN_COLLECTION;

        if (hasNotice) return "MISE_EN_DEMEURE";
        if (isOverdue && debt.getBalance().signum() > 0) return "EN_RETARD";
        if (debt.getPaidAmount().signum() > 0 && debt.getBalance().signum() > 0) return "RELANCE_EN_COURS";
        if (debt.getBalance().signum() > 0) return "EN_ATTENTE";
        return "EN_ATTENTE";
    }

    // ── Detail DTO ──────────────────────────────────────────

    public record TaxpayerInfo(
            Long id,
            String nif,
            String name,
            String phone,
            String email,
            String address,
            String taxCenterCode,
            String taxCenterName,
            String taxRegimeCode
    ) {
        public static TaxpayerInfo from(com.mnktax.taxpayer.entity.Taxpayer t) {
            return new TaxpayerInfo(
                    t.getId(),
                    t.getNif(),
                    t.getName(),
                    t.getPhone(),
                    t.getEmail(),
                    t.getAddress(),
                    t.getTaxCenter() != null ? t.getTaxCenter().getCode() : null,
                    t.getTaxCenter() != null ? t.getTaxCenter().getName() : null,
                    t.getTaxRegime() != null ? t.getTaxRegime().getCode() : null
            );
        }
    }

    public record CollectionDetailDto(
            Long id,
            String reference,
            String taxTypeCode,
            String taxTypeName,
            String period,
            BigDecimal principalAmount,
            BigDecimal penaltyAmount,
            BigDecimal interestAmount,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal balance,
            LocalDate issueDate,
            LocalDate dueDate,
            String debtStatus,
            String collectionStatus,
            String collectionPriority,
            String origin,
            String observations,
            int daysOverdue,
            TaxpayerInfo taxpayer,
            List<CollectionActionDto> actions,
            List<CollectionNoticeDto> notices
    ) {
        public static CollectionDetailDto from(
                com.mnktax.debt.entity.TaxDebt debt,
                List<CollectionActionDto> actions,
                List<CollectionNoticeDto> notices) {

            int daysOverdue = 0;
            if (debt.getDueDate().isBefore(java.time.LocalDate.now())
                    && debt.getStatus() != com.mnktax.debt.entity.DebtStatus.PAID
                    && debt.getStatus() != com.mnktax.debt.entity.DebtStatus.CANCELLED) {
                daysOverdue = (int) java.time.temporal.ChronoUnit.DAYS.between(
                        debt.getDueDate(), java.time.LocalDate.now());
            }

            return new CollectionDetailDto(
                    debt.getId(),
                    debt.getReference(),
                    debt.getTaxType().getCode(),
                    debt.getTaxType().getName(),
                    debt.getPeriod(),
                    debt.getPrincipalAmount(),
                    debt.getPenaltyAmount(),
                    debt.getInterestAmount(),
                    debt.getTotalAmount(),
                    debt.getPaidAmount(),
                    debt.getBalance(),
                    debt.getIssueDate(),
                    debt.getDueDate(),
                    debt.getStatus().name(),
                    resolveCollectionStatus(debt),
                    debt.getCollectionPriority().name(),
                    debt.getOrigin().name(),
                    debt.getObservations(),
                    daysOverdue,
                    TaxpayerInfo.from(debt.getTaxpayer()),
                    actions,
                    notices
            );
        }
    }

    // ── Statistics DTO ───────────────────────────────────────

    public record CollectionStatsDto(
            double collectionRate,
            BigDecimal totalCollected,
            BigDecimal totalOutstanding,
            long actionCount
    ) {
    }
}
