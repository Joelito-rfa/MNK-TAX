package com.mnktax.collection.dto;

import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.entity.CollectionNotice;
import com.mnktax.debt.entity.DebtHistory;
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

    public record CreateDisputeRequest(
            @NotNull(message = "L'ID de la créance est requis.") Long debtId,
            @NotBlank(message = "Le motif du litige est requis.") String reason,
            @Positive(message = "Le montant contesté doit être positif.") BigDecimal contestedAmount,
            LocalDate contestationDate
    ) {
    }

    public record ResolveDisputeRequest(
            @NotNull(message = "La décision est requise.") com.mnktax.debt.entity.DisputeDecision decision,
            String notes
    ) {
    }

    public record DisputeDto(
            Long id,
            String reference,
            Long debtId,
            String debtReference,
            String reason,
            BigDecimal contestedAmount,
            LocalDate contestationDate,
            com.mnktax.debt.entity.DisputeStatus status,
            com.mnktax.debt.entity.DisputeDecision decision,
            String decisionNotes,
            String decidedBy,
            Instant decidedAt,
            String createdBy,
            Instant createdAt
    ) {
        public static DisputeDto from(com.mnktax.debt.entity.DebtDispute d) {
            return new DisputeDto(d.getId(), d.getReference(), d.getDebt().getId(),
                    d.getDebt().getReference(), d.getReason(), d.getContestedAmount(),
                    d.getContestationDate(), d.getStatus(), d.getDecision(), d.getDecisionNotes(),
                    d.getDecidedBy(), d.getDecidedAt(), d.getCreatedBy(), d.getCreatedAt());
        }
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

    /**
     * Événement d'historique global d'une créance (append-only), utilisé par
     * la page {@code /collection/history}.
     */
    public record CollectionEventDto(
            Long id,
            Long debtId,
            String debtReference,
            String nif,
            String taxpayerName,
            String eventType,
            String description,
            String oldValue,
            String newValue,
            String performedBy,
            Instant eventDate
    ) {
        public static CollectionEventDto from(DebtHistory h) {
            return new CollectionEventDto(
                    h.getId(),
                    h.getDebt().getId(),
                    h.getDebt().getReference(),
                    h.getDebt().getTaxpayer().getNif(),
                    h.getDebt().getTaxpayer().getName(),
                    h.getEventType(),
                    h.getDescription(),
                    h.getOldValue(),
                    h.getNewValue(),
                    h.getPerformedBy(),
                    h.getEventDate()
            );
        }
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
            String collectionPriority,
            String origin,
            long daysOverdue,
            String lastActionType,
            String lastAction,
            LocalDate lastActionDate,
            String lastResponsible,
            String nextAction,
            LocalDate nextActionDate
    ) {
        public static CollectionDebtRowDto from(TaxDebt debt,
                                                 String lastActionType,
                                                 String lastActionDesc,
                                                 LocalDate lastActionDt,
                                                 String lastResponsible,
                                                 String nextAct,
                                                 LocalDate nextActDt) {
            return new CollectionDebtRowDto(
                    debt.getId(),
                    debt.getReference(),
                    debt.getTaxpayer().getNif(),
                    debt.getTaxpayer().getName(),
                    debt.getTaxType() != null ? debt.getTaxType().getCode() : null,
                    debt.getPeriod(),
                    debt.getTotalAmount(),
                    debt.getPaidAmount(),
                    debt.getBalance(),
                    debt.getDueDate(),
                    debt.getStatus().name(),
                    resolveCollectionStatus(debt),
                    debt.getCollectionPriority() != null ? debt.getCollectionPriority().name() : "NORMAL",
                    debt.getOrigin() != null ? debt.getOrigin().name() : "OTHER",
                    computeDaysOverdue(debt),
                    lastActionType,
                    lastActionDesc,
                    lastActionDt,
                    lastResponsible,
                    nextAct,
                    nextActDt
            );
        }
    }

    /**
     * Libellé d'affichage (français) calculé à partir du statut réel.
     * La source de vérité reste {@code debtStatus} ; ce libellé n'est qu'une
     * présentation et couvre TOUS les statuts possibles pour qu'aucun dossier
     * ne soit affiché avec un état contradictoire.
     */
    public static String resolveCollectionStatus(TaxDebt debt) {
        if (debt.getStatus() == null) return "EN_ATTENTE";
        boolean pastDueUnpaid = debt.getBalance().signum() > 0
                && debt.getDueDate() != null
                && debt.getDueDate().isBefore(LocalDate.now());
        return switch (debt.getStatus()) {
            case PAID -> "PAYE";
            case CANCELLED -> "ANNULE";
            case CLOSED -> "CLOTUREE";
            case SUSPENDED -> "SUSPENDUE";
            case DISPUTED -> "CONTENTIEUX";
            case IN_COLLECTION -> "MISE_EN_DEMEURE";
            case OVERDUE -> "EN_RETARD";
            case PARTIALLY_PAID -> pastDueUnpaid ? "EN_RETARD" : "PAIEMENT_PARTIEL";
            default -> pastDueUnpaid ? "EN_RETARD" : "EN_ATTENTE";
        };
    }

    /**
     * Nombre de jours de retard réel d'une créance (0 si non échue ou soldée).
     */
    public static long computeDaysOverdue(TaxDebt debt) {
        if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED
                || debt.getStatus() == DebtStatus.CLOSED) {
            return 0;
        }
        LocalDate today = LocalDate.now();
        boolean overdue = (debt.getStatus() == DebtStatus.OVERDUE
                || debt.getStatus() == DebtStatus.IN_COLLECTION
                || (debt.getBalance().signum() > 0 && debt.getDueDate().isBefore(today)));
        if (!overdue) return 0;
        return Math.max(0, ChronoUnit.DAYS.between(debt.getDueDate(), today));
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
            List<CollectionNoticeDto> notices,
            List<DisputeDto> disputes
    ) {
        public static CollectionDetailDto from(
                com.mnktax.debt.entity.TaxDebt debt,
                List<CollectionActionDto> actions,
                List<CollectionNoticeDto> notices,
                List<DisputeDto> disputes) {

            return new CollectionDetailDto(
                    debt.getId(),
                    debt.getReference(),
                    debt.getTaxType() != null ? debt.getTaxType().getCode() : null,
                    debt.getTaxType() != null ? debt.getTaxType().getName() : null,
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
                    debt.getCollectionPriority() != null ? debt.getCollectionPriority().name() : "NORMAL",
                    debt.getOrigin() != null ? debt.getOrigin().name() : "OTHER",
                    debt.getObservations(),
                    (int) computeDaysOverdue(debt),
                    TaxpayerInfo.from(debt.getTaxpayer()),
                    actions,
                    notices,
                    disputes
            );
        }
    }

    // ── Statistics DTO ───────────────────────────────────────

    public record CollectionStatsDto(
            double collectionRate,
            BigDecimal totalExigible,
            BigDecimal totalCollected,
            BigDecimal totalOutstanding,
            long totalDebts,
            long overdueDebts,
            BigDecimal overdueBalance,
            long overdue30,
            long overdue60,
            long overdue90,
            long partialDebts,
            long disputedDebts,
            long suspendedDebts,
            long reminderActions,
            long noticeCount,
            long actionCount
    ) {
        public static CollectionStatsDto empty() {
            return new CollectionStatsDto(0.0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    0, 0, BigDecimal.ZERO, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }
    }

    // ── Synthèse de l'onglet « En retard » ───────────────────

    public record OverdueSummaryDto(
            long count,
            BigDecimal totalBalance,
            long averageDays,
            LocalDate oldestDueDate
    ) {
    }
}
