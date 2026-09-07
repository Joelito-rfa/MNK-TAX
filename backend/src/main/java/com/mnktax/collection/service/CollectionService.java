package com.mnktax.collection.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.collection.dto.CollectionDtos.CollectionActionDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDebtRowDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDetailDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionEventDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionHistoryDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionNoticeDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionStatsDto;
import com.mnktax.collection.dto.CollectionDtos.CreateActionRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateNoticeRequest;
import com.mnktax.collection.dto.CollectionDtos.DisputeDto;
import com.mnktax.collection.dto.CollectionDtos.ResolveDisputeRequest;
import com.mnktax.collection.dto.CollectionDtos.OverdueSummaryDto;
import com.mnktax.collection.dto.CollectionDtos.RegisterPaymentRequest;
import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.entity.CollectionNotice;
import com.mnktax.collection.repository.CollectionActionRepository;
import com.mnktax.collection.repository.CollectionNoticeRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtDispute;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtOrigin;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.DisputeDecision;
import com.mnktax.debt.entity.DisputeStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtDisputeRepository;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Module Recouvrement : suivi des créances, relances, mises en demeure et
 * paiements. Les montants (soldes, totaux) proviennent toujours du backend ;
 * aucun workflow juridique n'est déclenché automatiquement par un seuil de
 * jours — une mise en demeure ne peut naître que d'une action explicite et
 * autorisée d'un agent.
 */
@Service
public class CollectionService {

    /** Types de mise en demeure considérés comme un acte formel de recouvrement. */
    private static final Set<String> FORMAL_NOTICE_TYPES = Set.of(
            "MISE_EN_DEMEURE", "NOTICE", "COMMANDEMENT", "COMMANDEMENT_DE_PAYER");

    private final CollectionActionRepository actionRepository;
    private final CollectionNoticeRepository noticeRepository;
    private final TaxDebtRepository debtRepository;
    private final DebtDisputeRepository disputeRepository;
    private final DebtHistoryRepository historyRepository;
    private final DebtService debtService;
    private final PaymentService paymentService;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public CollectionService(CollectionActionRepository actionRepository,
                             CollectionNoticeRepository noticeRepository,
                             TaxDebtRepository debtRepository,
                             DebtDisputeRepository disputeRepository,
                             DebtHistoryRepository historyRepository,
                             DebtService debtService,
                             PaymentService paymentService,
                             AuditService auditService,
                             UserRepository userRepository) {
        this.actionRepository = actionRepository;
        this.noticeRepository = noticeRepository;
        this.debtRepository = debtRepository;
        this.disputeRepository = disputeRepository;
        this.historyRepository = historyRepository;
        this.debtService = debtService;
        this.paymentService = paymentService;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    // ── Actions ──────────────────────────────────────────────

    @Transactional
    public CollectionActionDto createAction(CreateActionRequest request, HttpServletRequest http) {
        TaxDebt debt = findDebt(request.debtId());
        checkOpenForAction(debt);
        CollectionAction action = CollectionAction.builder()
                .debt(debt)
                .type(request.type())
                .description(request.description())
                .actionDate(request.actionDate())
                .outcome(request.outcome())
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .nextAction(request.nextAction())
                .nextActionDate(request.nextActionDate())
                .createdAt(Instant.now())
                .build();
        CollectionAction saved = actionRepository.save(action);

        historyRepository.save(DebtHistory.builder()
                .debt(debt)
                .eventType("REMINDER_CREATED")
                .description(actionLabel(saved.getType()) + " : " + saved.getDescription())
                .oldValue(null)
                .newValue(saved.getType().name())
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());

        auditService.record("COLLECTION_ACTION", "DEBT", String.valueOf(debt.getId()),
                null, saved.getType() + " : " + saved.getDescription(), http);
        return toActionDto(saved, null);
    }

    // ── Notices (mises en demeure) ───────────────────────────

    @Transactional
    public CollectionNoticeDto createNotice(CreateNoticeRequest request, HttpServletRequest http) {
        TaxDebt debt = findDebt(request.debtId());
        if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED
                || debt.getStatus() == DebtStatus.CLOSED || debt.getStatus() == DebtStatus.SUSPENDED) {
            throw new BusinessException("DEBT_CLOSED",
                    "Cette créance est " + debt.getStatus()
                            + " : aucune mise en demeure ne peut être émise.");
        }

        String noticeType = request.noticeType() == null || request.noticeType().isBlank()
                ? "MISE_EN_DEMEURE"
                : request.noticeType().trim().toUpperCase();

        DebtStatus oldStatus = debt.getStatus();

        // Un acte formel place le dossier dans la phase « recouvrement » du
        // workflow — jamais automatiquement, toujours suite à une action
        // explicite et autorisée de l'agent.
        if (isFormalNotice(noticeType) && oldStatus != DebtStatus.IN_COLLECTION) {
            debtService.setInCollection(debt.getId());
            debt = findDebt(debt.getId());
        }

        CollectionNotice notice = CollectionNotice.builder()
                .debt(debt)
                .noticeNumber(ReferenceGenerator.documentRef("MD"))
                .noticeDate(LocalDate.now())
                .noticeType(noticeType)
                .content(request.content())
                .sentAt(Instant.now())
                .status("SENT")
                .createdAt(Instant.now())
                .build();
        CollectionNotice saved = noticeRepository.save(notice);

        actionRepository.save(CollectionAction.builder()
                .debt(debt)
                .type(CollectionActionType.NOTICE)
                .description("Mise en demeure " + saved.getNoticeNumber()
                        + (saved.getContent() != null ? " — " + saved.getContent() : ""))
                .actionDate(LocalDate.now())
                .outcome("Mise en demeure émise")
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .createdAt(Instant.now())
                .build());

        historyRepository.save(DebtHistory.builder()
                .debt(debt)
                .eventType("FORMAL_NOTICE_CREATED")
                .description("Mise en demeure émise (" + noticeType + ") : " + saved.getNoticeNumber())
                .oldValue(oldStatus.name())
                .newValue(debt.getStatus().name())
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());

        auditService.record("COLLECTION_NOTICE", "DEBT", String.valueOf(debt.getId()),
                oldStatus.name(), saved.getNoticeNumber(), http);
        return CollectionNoticeDto.from(saved);
    }

    // ── Litiges (contentieux) ────────────────────────────────

    @Transactional
    public DisputeDto createDispute(CreateDisputeRequest request, HttpServletRequest http) {
        TaxDebt debt = findDebt(request.debtId());
        checkOpenForAction(debt);
        if (debt.getStatus() == DebtStatus.SUSPENDED) {
            throw new BusinessException("DEBT_SUSPENDED",
                    "Cette créance est suspendue : réactivez-la avant de déclarer un litige.");
        }
        if (disputeRepository.existsByDebtIdAndStatus(debt.getId(), DisputeStatus.OPEN)) {
            throw new BusinessException("DISPUTE_ALREADY_OPEN",
                    "Un litige est déjà en cours sur cette créance.");
        }
        if (request.contestedAmount() != null
                && request.contestedAmount().compareTo(debt.getBalance()) > 0) {
            throw new BusinessException("DISPUTE_EXCEEDS_BALANCE",
                    "Le montant contesté (" + request.contestedAmount()
                            + ") dépasse le solde de la créance (" + debt.getBalance() + ").");
        }

        DebtDispute dispute = DebtDispute.builder()
                .reference(ReferenceGenerator.next("LIT"))
                .debt(debt)
                .reason(request.reason())
                .contestedAmount(request.contestedAmount())
                .contestationDate(request.contestationDate() != null
                        ? request.contestationDate() : LocalDate.now())
                .status(DisputeStatus.OPEN)
                .createdBy(SecurityUtils.currentUsername())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        disputeRepository.save(dispute);

        // La créance passe en CONTENTIEUX (action explicite de l'agent).
        DebtStatus oldStatus = debt.getStatus();
        debtService.markDisputed(debt.getId(), request.reason());
        debt = findDebt(debt.getId());

        actionRepository.save(CollectionAction.builder()
                .debt(debt)
                .type(CollectionActionType.DISPUTE)
                .description("Litige " + dispute.getReference() + " déclaré : " + request.reason()
                        + (request.contestedAmount() != null
                        ? " — montant contesté : " + request.contestedAmount() + " MGA" : ""))
                .actionDate(LocalDate.now())
                .outcome("Créance en contentieux")
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .createdAt(Instant.now())
                .build());

        auditService.record("DISPUTE_CREATED", "DEBT", String.valueOf(debt.getId()),
                oldStatus.name(), dispute.getReference(), http);
        return DisputeDto.from(dispute);
    }

    @Transactional
    public DisputeDto resolveDispute(Long disputeId, ResolveDisputeRequest request, HttpServletRequest http) {
        DebtDispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Litige", disputeId));
        if (dispute.getStatus() != DisputeStatus.OPEN) {
            throw new BusinessException("DISPUTE_ALREADY_RESOLVED",
                    "Ce litige a déjà fait l'objet d'une décision.");
        }

        TaxDebt debt = dispute.getDebt();
        DebtStatus oldStatus = debt.getStatus();

        dispute.setStatus(DisputeStatus.RESOLVED);
        dispute.setDecision(request.decision());
        dispute.setDecisionNotes(request.notes());
        dispute.setDecidedBy(SecurityUtils.currentUsername());
        dispute.setDecidedAt(Instant.now());
        dispute.setUpdatedAt(Instant.now());
        disputeRepository.save(dispute);

        String decisionLabel = switch (request.decision()) {
            case SUSTAINED -> "admise";
            case REJECTED -> "rejetée";
            case WITHDRAWN -> "retirée";
        };

        // Seules les décisions REJECTED / WITHDRAWN replacent la créance en
        // recouvrement. Une décision SUSTAINED nécessite une régularisation
        // explicite (annulation / réduction / clôture) : aucune règle n'est
        // inventée et le dossier reste en contentieux jusqu'à cette action.
        if (request.decision() == DisputeDecision.REJECTED
                || request.decision() == DisputeDecision.WITHDRAWN) {
            debtService.reopenFromDispute(debt.getId());
            debt = findDebt(debt.getId());
        }

        actionRepository.save(CollectionAction.builder()
                .debt(debt)
                .type(CollectionActionType.DISPUTE_DECISION)
                .description("Litige " + dispute.getReference() + " — contestation " + decisionLabel
                        + (request.notes() != null ? " : " + request.notes() : ""))
                .actionDate(LocalDate.now())
                .outcome("Décision : " + decisionLabel)
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .createdAt(Instant.now())
                .build());

        historyRepository.save(DebtHistory.builder()
                .debt(debt)
                .eventType("DISPUTE_RESOLVED")
                .description("Décision sur litige " + dispute.getReference()
                        + " : contestation " + decisionLabel
                        + (request.notes() != null ? " — " + request.notes() : ""))
                .oldValue(DisputeStatus.OPEN.name())
                .newValue(request.decision().name())
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());

        auditService.record("DISPUTE_RESOLVED", "DEBT", String.valueOf(debt.getId()),
                oldStatus.name(), request.decision().name(), http);
        return DisputeDto.from(dispute);
    }

    @Transactional(readOnly = true)
    public List<DisputeDto> disputesOf(Long debtId) {
        findDebt(debtId);
        return disputeRepository.findByDebtIdOrderByContestationDateDescCreatedAtDesc(debtId)
                .stream().map(DisputeDto::from).toList();
    }

    @Transactional(readOnly = true)
    public DisputeDto disputeOf(Long disputeId) {
        DebtDispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Litige", disputeId));
        return DisputeDto.from(dispute);
    }

    // ── Recherche d'actions ──────────────────────────────────

    @Transactional(readOnly = true)
    public Page<CollectionActionDto> searchActions(Long debtId, Long taxpayerId, CollectionActionType type,
                                                   String q, Pageable pageable) {
        Page<CollectionAction> page = actionRepository.search(debtId, taxpayerId, type, blankToNull(q), pageable);
        Map<Long, String> names = loadUserNames(page.getContent().stream()
                .map(CollectionAction::getResponsibleUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet()));
        return page.map(a -> a.getResponsibleUserId() != null
                ? toActionDto(a, names.get(a.getResponsibleUserId()))
                : toActionDto(a, null));
    }

    @Transactional(readOnly = true)
    public Page<CollectionNoticeDto> searchNotices(Long debtId, String noticeType, String q, Pageable pageable) {
        return noticeRepository.search(debtId, blankToNull(noticeType), blankToNull(q), pageable)
                .map(CollectionNoticeDto::from);
    }

    @Transactional(readOnly = true)
    public Page<CollectionEventDto> searchEvents(Long debtId, String eventType, String q, Pageable pageable) {
        return historyRepository.search(debtId, blankToNull(eventType), blankToNull(q), pageable)
                .map(CollectionEventDto::from);
    }

    // ── Historique d'une créance ─────────────────────────────

    @Transactional(readOnly = true)
    public CollectionHistoryDto history(Long debtId) {
        findDebt(debtId);
        List<CollectionActionDto> actions = actionRepository.findByDebtIdOrderByActionDateDesc(debtId)
                .stream().map(a -> toActionDto(a, null)).toList();
        List<CollectionNoticeDto> notices = noticeRepository.findByDebtIdOrderByNoticeDateDesc(debtId)
                .stream().map(CollectionNoticeDto::from).toList();
        return new CollectionHistoryDto(actions, notices);
    }

    // ── Détail ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CollectionDetailDto detail(Long debtId) {
        TaxDebt debt = findDebt(debtId);
        List<CollectionActionDto> actions = actionRepository.findByDebtIdOrderByActionDateDesc(debtId)
                .stream().map(a -> toActionDto(a, null)).toList();
        List<CollectionNoticeDto> notices = noticeRepository.findByDebtIdOrderByNoticeDateDesc(debtId)
                .stream().map(CollectionNoticeDto::from).toList();
        List<DisputeDto> disputes = disputesOf(debtId);
        return CollectionDetailDto.from(debt, actions, notices, disputes);
    }

    // ── Tableau des créances (onglets recouvrement) ──────────

    @Transactional(readOnly = true)
    public Page<CollectionDebtRowDto> getCollectionDebts(DebtStatus status, String taxTypeCode, String period,
                                                         DebtOrigin origin, DebtCollectionPriority priority,
                                                         boolean overdue, boolean inCollection, boolean hasReminder,
                                                         BigDecimal balanceMin, BigDecimal balanceMax,
                                                         LocalDate dueFrom, LocalDate dueTo,
                                                         String q, Pageable pageable) {
        Page<TaxDebt> page = debtRepository.searchCollection(status, blankToNull(taxTypeCode), blankToNull(period),
                origin, priority, overdue, inCollection, hasReminder,
                balanceMin, balanceMax, dueFrom, dueTo, blankToNull(q), LocalDate.now(), pageable);

        List<TaxDebt> debts = page.getContent();
        Map<Long, CollectionAction> lastActions = debts.isEmpty() ? Map.of()
                : actionRepository.findLatestByDebtIds(debts.stream().map(TaxDebt::getId).toList()).stream()
                        .collect(Collectors.toMap(a -> a.getDebt().getId(), Function.identity(), (a, b) -> a));

        Set<Long> responsibleIds = lastActions.values().stream()
                .map(CollectionAction::getResponsibleUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> userNames = loadUserNames(responsibleIds);

        return page.map(debt -> {
            CollectionAction lastAction = lastActions.get(debt.getId());
            String lastType = null;
            String lastDesc = null;
            LocalDate lastDate = null;
            String responsible = null;
            String nextAct = null;
            LocalDate nextActDate = null;
            if (lastAction != null) {
                lastType = lastAction.getType() != null ? lastAction.getType().name() : null;
                lastDesc = lastAction.getDescription();
                lastDate = lastAction.getActionDate();
                responsible = lastAction.getResponsibleUserId() != null
                        ? userNames.get(lastAction.getResponsibleUserId())
                        : null;
                nextAct = lastAction.getNextAction();
                nextActDate = lastAction.getNextActionDate();
            }
            return CollectionDebtRowDto.from(debt, lastType, lastDesc, lastDate, responsible, nextAct, nextActDate);
        });
    }

    // ── Périodes disponibles ─────────────────────────────────

    @Transactional(readOnly = true)
    public List<String> periods() {
        return debtRepository.findDistinctPeriods();
    }

    // ── Synthèse « En retard » ───────────────────────────────

    @Transactional(readOnly = true)
    public OverdueSummaryDto overdueSummary(String taxTypeCode, String period, String q) {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = debtRepository.overdueDetails(
                blankToNull(taxTypeCode), blankToNull(period), blankToNull(q), today);
        BigDecimal total = BigDecimal.ZERO;
        LocalDate oldest = null;
        long daysSum = 0;
        for (Object[] row : rows) {
            LocalDate due = (LocalDate) row[0];
            BigDecimal balance = (BigDecimal) row[1];
            if (due != null && balance != null) {
                total = total.add(balance);
                long overdueDays = ChronoUnit.DAYS.between(due, today);
                daysSum += Math.max(0, overdueDays);
                if (oldest == null || due.isBefore(oldest)) {
                    oldest = due;
                }
            }
        }
        long count = rows.size();
        long avg = count > 0 ? Math.round((double) daysSum / count) : 0;
        return new OverdueSummaryDto(count, total, avg, oldest);
    }

    // ── Statistiques (KPI réels) ─────────────────────────────

    @Transactional(readOnly = true)
    public CollectionStatsDto stats() {
        LocalDate today = LocalDate.now();
        BigDecimal totalCollected = debtRepository.totalCollected();
        BigDecimal totalOutstanding = debtRepository.totalOutstanding();
        BigDecimal totalExigible = totalCollected.add(totalOutstanding);

        double collectionRate = 0.0;
        if (totalExigible.signum() > 0) {
            collectionRate = totalCollected.multiply(BigDecimal.valueOf(100))
                    .divide(totalExigible, 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        return new CollectionStatsDto(
                collectionRate,
                totalExigible,
                totalCollected,
                totalOutstanding,
                debtRepository.countNotCancelled(),
                debtRepository.countOverdue(today),
                debtRepository.sumOverdueBalance(today),
                debtRepository.countOverdueOlderThan(today.minusDays(30)),
                debtRepository.countOverdueOlderThan(today.minusDays(60)),
                debtRepository.countOverdueOlderThan(today.minusDays(90)),
                debtRepository.countByStatus(DebtStatus.PARTIALLY_PAID),
                debtRepository.countByStatus(DebtStatus.DISPUTED),
                debtRepository.countByStatus(DebtStatus.SUSPENDED),
                actionRepository.countByType(CollectionActionType.REMINDER),
                noticeRepository.count(),
                actionRepository.countAll()
        );
    }

    // ── Paiement depuis le module recouvrement ───────────────

    @Transactional
    public com.mnktax.payment.dto.PaymentDtos.PaymentDto registerPayment(RegisterPaymentRequest request,
                                                                         HttpServletRequest http) {
        PaymentMethod method;
        try {
            method = PaymentMethod.valueOf(request.method());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("INVALID_PAYMENT_METHOD", "Mode de paiement invalide : " + request.method());
        }

        CreatePaymentRequest paymentRequest = new CreatePaymentRequest(
                request.debtId(),
                request.amount(),
                request.paymentDate(),
                method,
                null,
                null,
                null,
                null
        );
        return paymentService.record(paymentRequest, http);
    }

    // ── Helpers ──────────────────────────────────────────────

    private TaxDebt findDebt(Long id) {
        return debtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Créance", id));
    }

    private void checkOpenForAction(TaxDebt debt) {
        if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED
                || debt.getStatus() == DebtStatus.CLOSED || debt.getStatus() == DebtStatus.SUSPENDED) {
            throw new BusinessException("DEBT_CLOSED",
                    "Cette créance est " + debt.getStatus() + " : aucune action de recouvrement possible.");
        }
    }

    private static boolean isFormalNotice(String noticeType) {
        return noticeType != null && FORMAL_NOTICE_TYPES.contains(noticeType.toUpperCase());
    }

    private Map<Long, String> loadUserNames(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(new HashSet<>(ids)).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a));
    }

    private CollectionActionDto toActionDto(CollectionAction a, String responsibleName) {
        return new CollectionActionDto(a.getId(), a.getDebt().getId(), a.getDebt().getReference(),
                a.getDebt().getTaxpayer().getNif(), a.getDebt().getTaxpayer().getName(),
                a.getType(), a.getDescription(), a.getActionDate(), a.getOutcome(),
                a.getResponsibleUserId(), responsibleName, a.getStatus(),
                a.getNextAction(), a.getNextActionDate(), a.getCreatedAt());
    }

    private static String actionLabel(CollectionActionType type) {
        return type == null ? "Action" : type.name().replace('_', ' ');
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
