package com.mnktax.paymentplan.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.repository.CollectionActionRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.notification.entity.NotificationType;
import com.mnktax.notification.service.NotificationService;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.CancelPlanRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.CreatePlanRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.InstallmentRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.PlanDto;
import com.mnktax.paymentplan.entity.InstallmentStatus;
import com.mnktax.paymentplan.entity.PaymentPlan;
import com.mnktax.paymentplan.entity.PaymentPlanInstallment;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import com.mnktax.paymentplan.repository.PaymentPlanRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Échéanciers (plans de paiement) du recouvrement amiable.
 *
 * Règles métier :
 * - Un seul échéancier ACTIVE par créance ;
 * - le montant de l'échéancier ne peut pas dépasser le solde de la créance ;
 * - les tranches sont soldées par les PAIEMENTS RÉELS (allocations) —
 *   le plan n'est jamais alimenté directement, il est resynchronisé à
 *   chaque paiement / annulation de paiement ;
 * - une tranche échue non soldée devient OVERDUE lors de la détection
 *   quotidienne (alerte + notification) : aucune procédure juridique
 *   n'est jamais déclenchée automatiquement.
 */
@Service
public class PaymentPlanService {

    private final PaymentPlanRepository planRepository;
    private final TaxDebtRepository debtRepository;
    private final PaymentAllocationRepository allocationRepository;
    private final DebtHistoryRepository historyRepository;
    private final CollectionActionRepository actionRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public PaymentPlanService(PaymentPlanRepository planRepository,
                              TaxDebtRepository debtRepository,
                              PaymentAllocationRepository allocationRepository,
                              DebtHistoryRepository historyRepository,
                              CollectionActionRepository actionRepository,
                              NotificationService notificationService,
                              AuditService auditService) {
        this.planRepository = planRepository;
        this.debtRepository = debtRepository;
        this.allocationRepository = allocationRepository;
        this.historyRepository = historyRepository;
        this.actionRepository = actionRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    // ── Création ─────────────────────────────────────────────

    @Transactional
    public PlanDto create(CreatePlanRequest request, HttpServletRequest http) {
        TaxDebt debt = debtRepository.findById(request.debtId())
                .orElseThrow(() -> new ResourceNotFoundException("Créance", request.debtId()));

        if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED
                || debt.getStatus() == DebtStatus.CLOSED) {
            throw new BusinessException("DEBT_NOT_PLANNABLE",
                    "Impossible d'échelonner une créance " + debt.getStatus() + ".");
        }
        if (planRepository.countByDebtIdAndStatus(debt.getId(), PaymentPlanStatus.ACTIVE) > 0) {
            throw new BusinessException("PLAN_ALREADY_ACTIVE",
                    "Une échéancier est déjà en cours sur cette créance.");
        }
        if (request.installments().size() > 60) {
            throw new BusinessException("PLAN_TOO_MANY_INSTALLMENTS",
                    "Le nombre de tranches est limité à 60.");
        }

        LocalDate today = LocalDate.now();
        BigDecimal total = BigDecimal.ZERO;
        for (InstallmentRequest inst : request.installments()) {
            if (inst.dueDate().isBefore(today)) {
                throw new BusinessException("INSTALLMENT_DATE_IN_PAST",
                        "La date de la tranche du " + inst.dueDate() + " est antérieure à aujourd'hui.");
            }
            total = total.add(inst.amount());
        }
        if (total.signum() <= 0) {
            throw new BusinessException("PLAN_EMPTY",
                    "Le montant total de l'échéancier doit être positif.");
        }
        if (total.compareTo(debt.getBalance()) > 0) {
            throw new BusinessException("PLAN_EXCEEDS_BALANCE",
                    "L'échéancier (" + total + " MGA) dépasse le solde de la créance ("
                            + debt.getBalance() + " MGA).");
        }

        List<InstallmentRequest> sorted = request.installments().stream()
                .sorted(Comparator.comparing(InstallmentRequest::dueDate))
                .toList();

        Instant now = Instant.now();
        PaymentPlan plan = PaymentPlan.builder()
                .reference(ReferenceGenerator.next("ECH"))
                .debt(debt)
                .label(request.label())
                .totalAmount(total)
                .status(PaymentPlanStatus.ACTIVE)
                .notes(request.notes())
                .createdBy(SecurityUtils.currentUsername())
                .createdAt(now)
                .updatedAt(now)
                .build();

        int number = 1;
        for (InstallmentRequest inst : sorted) {
            plan.addInstallment(PaymentPlanInstallment.builder()
                    .installmentNumber(number++)
                    .dueDate(inst.dueDate())
                    .amount(inst.amount())
                    .paidAmount(BigDecimal.ZERO)
                    .status(InstallmentStatus.PENDING)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }
        planRepository.save(plan);

        // Traces
        actionRepository.save(CollectionAction.builder()
                .debt(debt)
                .type(CollectionActionType.PAYMENT_PLAN)
                .description("Échéancier " + plan.getReference() + " créé — "
                        + total + " MGA en " + request.installments().size() + " tranche(s)")
                .actionDate(LocalDate.now())
                .outcome("Échéancier actif")
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .createdAt(Instant.now())
                .build());
        historyRepository.save(DebtHistory.builder()
                .debt(debt)
                .eventType("PAYMENT_PLAN_CREATED")
                .description("Échéancier " + plan.getReference() + " : " + request.label()
                        + " — " + total + " MGA en " + request.installments().size() + " tranche(s)")
                .oldValue(null)
                .newValue(plan.getReference())
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());
        auditService.record("PAYMENT_PLAN_CREATED", "DEBT", String.valueOf(debt.getId()),
                null, plan.getReference(), http);

        return PlanDto.from(plan);
    }

    // ── Consultation ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public com.mnktax.paymentplan.dto.PaymentPlanDtos.PlanStatsDto stats() {
        LocalDate today = LocalDate.now();
        long active = planRepository.countByStatus(PaymentPlanStatus.ACTIVE);
        long completed = planRepository.countByStatus(PaymentPlanStatus.COMPLETED);
        long cancelled = planRepository.countByStatus(PaymentPlanStatus.CANCELLED);
        long overdueInstallments = planRepository.countOverdueInstallments(PaymentPlanStatus.ACTIVE, today);
        long plansWithOverdue = planRepository.countPlansWithOverdueInstallments(PaymentPlanStatus.ACTIVE, today);
        return new com.mnktax.paymentplan.dto.PaymentPlanDtos.PlanStatsDto(
                active, completed, cancelled, overdueInstallments, plansWithOverdue);
    }

    @Transactional(readOnly = true)
    public Page<PlanDto> list(PaymentPlanStatus status, Long debtId, String q, Pageable pageable) {
        String q2 = (q == null || q.isBlank()) ? null : q.trim();
        return planRepository.search(status, debtId, q2, pageable).map(PlanDto::from);
    }

    @Transactional(readOnly = true)
    public PlanDto get(Long id) {
        return PlanDto.from(find(id));
    }

    @Transactional
    public PlanDto cancel(Long id, CancelPlanRequest request, HttpServletRequest http) {
        PaymentPlan plan = find(id);
        if (plan.getStatus() == PaymentPlanStatus.CANCELLED) {
            throw new BusinessException("PLAN_ALREADY_CANCELLED", "Cet échéancier est déjà annulé.");
        }
        PaymentPlanStatus oldStatus = plan.getStatus();
        plan.setStatus(PaymentPlanStatus.CANCELLED);
        plan.setUpdatedAt(Instant.now());
        for (PaymentPlanInstallment inst : plan.getInstallments()) {
            if (inst.getStatus() != InstallmentStatus.PAID) {
                inst.setStatus(InstallmentStatus.CANCELLED);
                inst.setUpdatedAt(Instant.now());
            }
        }
        planRepository.save(plan);

        historyRepository.save(DebtHistory.builder()
                .debt(plan.getDebt())
                .eventType("PAYMENT_PLAN_CANCELLED")
                .description("Échéancier " + plan.getReference() + " annulé"
                        + (request != null && request.reason() != null ? " : " + request.reason() : ""))
                .oldValue(oldStatus.name())
                .newValue(PaymentPlanStatus.CANCELLED.name())
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());
        auditService.record("PAYMENT_PLAN_CANCELLED", "DEBT", String.valueOf(plan.getDebt().getId()),
                oldStatus.name(), PaymentPlanStatus.CANCELLED.name(), http);
        return PlanDto.from(plan);
    }

    // ── Synchronisation avec les paiements réels ─────────────

    /**
     * Resynchronise les échéanciers d'une créance à partir des allocations de
     * paiement réellement enregistrées (source de vérité unique — jamais de
     * saisie directe sur les tranches). Appelé après chaque enregistrement,
     * allocation ou annulation de paiement.
     *
     * Règle d'affectation (FIFO) : l'argent reçu solde d'abord l'échéancier le
     * plus ancien, puis — au sein d'un échéancier — la tranche due la plus
     * ancienne (par date d'échéance, puis numéro). Une annulation retire
     * l'argent dans l'ordre inverse : les tranches les plus récentes se
     * rouvrent en premier.
     */
    @Transactional
    public void syncFromPayments(Long debtId) {
        if (debtId == null) return;
        List<PaymentPlan> plans = planRepository.findByDebtIdAndStatusInOrderByCreatedAtAsc(
                debtId, List.of(PaymentPlanStatus.ACTIVE, PaymentPlanStatus.COMPLETED));
        if (plans.isEmpty()) return;

        BigDecimal money = allocationRepository.findByDebtIdOrderByIdAsc(debtId).stream()
                .map(PaymentAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // L'argent circule des plans les plus anciens vers les plus récents :
        // chaque échéancier absorbe d'abord ce qui lui revient, le solde
        // restant est transmis au suivant. Tous les plans sont recalculés,
        // même ceux sans argent (annulation : ils doivent se rouvrir).
        for (PaymentPlan plan : plans) {
            BigDecimal absorbed = recomputeInstallments(plan, money);
            money = money.subtract(absorbed);
        }
    }

    /**
     * Recalcule l'état des tranches d'un plan à partir de l'argent disponible.
     * Les tranches sont soldées par date d'échéance croissante (la plus
     * ancienne d'abord). Retourne le montant réellement absorbé par le plan.
     */
    private BigDecimal recomputeInstallments(PaymentPlan plan, BigDecimal available) {
        PaymentPlanStatus before = plan.getStatus();
        BigDecimal pool = available.min(plan.getTotalAmount()).max(BigDecimal.ZERO);
        BigDecimal consumed = BigDecimal.ZERO;
        boolean changed = false;
        boolean fullyPaid = true;
        LocalDate today = LocalDate.now();
        Instant now = Instant.now();

        // FIFO : la tranche due la plus ancienne d'abord (ordre de création =
        // ordre des échéances, maintenu explicitement par date puis numéro).
        List<PaymentPlanInstallment> sorted = plan.getInstallments().stream()
                .sorted(Comparator.comparing(PaymentPlanInstallment::getDueDate)
                        .thenComparing(PaymentPlanInstallment::getInstallmentNumber))
                .toList();

        for (PaymentPlanInstallment inst : sorted) {
            BigDecimal paid = pool.min(inst.getAmount()).max(BigDecimal.ZERO);
            pool = pool.subtract(paid);
            consumed = consumed.add(paid);

            InstallmentStatus oldStatus = inst.getStatus();
            boolean wasPaid = inst.getPaidAmount().compareTo(inst.getAmount()) >= 0;
            boolean hadMoney = inst.getPaidAmount().signum() > 0;

            InstallmentStatus newStatus;
            if (paid.compareTo(inst.getAmount()) >= 0) {
                newStatus = InstallmentStatus.PAID;
            } else if (paid.signum() > 0) {
                newStatus = InstallmentStatus.PARTIALLY_PAID;
                fullyPaid = false;
            } else if (inst.getDueDate().isBefore(today)) {
                newStatus = InstallmentStatus.OVERDUE;
                fullyPaid = false;
            } else {
                newStatus = InstallmentStatus.PENDING;
                fullyPaid = false;
            }

            if (oldStatus != newStatus || inst.getPaidAmount().compareTo(paid) != 0) {
                changed = true;
                inst.setStatus(newStatus);
                inst.setPaidAmount(paid);
                if (newStatus == InstallmentStatus.PAID && !wasPaid) {
                    inst.setPaidAt(now);
                } else if (newStatus != InstallmentStatus.PAID) {
                    inst.setPaidAt(null);
                }
                inst.setUpdatedAt(now);

                // Journal append-only : la tranche est soldée ou entamée par un
                // paiement réel (visible dans l'historique de la créance).
                if (newStatus == InstallmentStatus.PAID && !wasPaid) {
                    historyRepository.save(DebtHistory.builder()
                            .debt(plan.getDebt())
                            .eventType("INSTALLMENT_PAID")
                            .description("Tranche n°" + inst.getInstallmentNumber()
                                    + " de l'échéancier " + plan.getReference()
                                    + " réglée (" + inst.getAmount() + " MGA) par les paiements enregistrés")
                            .oldValue(oldStatus.name())
                            .newValue(InstallmentStatus.PAID.name())
                            .performedBy(SecurityUtils.currentUsername())
                            .eventDate(now)
                            .createdAt(now)
                            .build());
                } else if (newStatus == InstallmentStatus.PARTIALLY_PAID && !hadMoney) {
                    historyRepository.save(DebtHistory.builder()
                            .debt(plan.getDebt())
                            .eventType("INSTALLMENT_PARTIALLY_PAID")
                            .description("Tranche n°" + inst.getInstallmentNumber()
                                    + " de l'échéancier " + plan.getReference()
                                    + " entamée : " + paid + " MGA réglés sur " + inst.getAmount() + " MGA")
                            .oldValue(oldStatus.name())
                            .newValue(InstallmentStatus.PARTIALLY_PAID.name())
                            .performedBy(SecurityUtils.currentUsername())
                            .eventDate(now)
                            .createdAt(now)
                            .build());
                }
            }
        }

        if (fullyPaid && before == PaymentPlanStatus.ACTIVE) {
            changed = true;
            plan.setStatus(PaymentPlanStatus.COMPLETED);
            historyRepository.save(DebtHistory.builder()
                    .debt(plan.getDebt())
                    .eventType("PAYMENT_PLAN_COMPLETED")
                    .description("Échéancier " + plan.getReference() + " entièrement réglé")
                    .oldValue(PaymentPlanStatus.ACTIVE.name())
                    .newValue(PaymentPlanStatus.COMPLETED.name())
                    .performedBy(SecurityUtils.currentUsername())
                    .eventDate(now)
                    .createdAt(now)
                    .build());
        } else if (!fullyPaid && before == PaymentPlanStatus.COMPLETED) {
            changed = true;
            plan.setStatus(PaymentPlanStatus.ACTIVE);
            historyRepository.save(DebtHistory.builder()
                    .debt(plan.getDebt())
                    .eventType("PAYMENT_PLAN_REACTIVATED")
                    .description("Échéancier " + plan.getReference()
                            + " réactivé après annulation de paiement")
                    .oldValue(PaymentPlanStatus.COMPLETED.name())
                    .newValue(PaymentPlanStatus.ACTIVE.name())
                    .performedBy(SecurityUtils.currentUsername())
                    .eventDate(now)
                    .createdAt(now)
                    .build());
        }

        if (changed) {
            plan.setUpdatedAt(now);
            planRepository.save(plan);
        }
        return consumed;
    }

    // ── Détection quotidienne des tranches échues ────────────

    /**
     * Marque OVERDUE les tranches échues non réglées des échéanciers actifs,
     * génère une alerte (trace) et notifie le contribuable. Retourne le nombre
     * de plans concernés. Aucune action juridique automatique.
     */
    @Transactional
    public int markOverdueInstallments(LocalDate today) {
        List<PaymentPlan> plans = planRepository.findActiveWithOverdueInstallments(
                PaymentPlanStatus.ACTIVE, today);
        Instant now = Instant.now();
        int affected = 0;
        for (PaymentPlan plan : plans) {
            List<PaymentPlanInstallment> newlyOverdue = new ArrayList<>();
            boolean changed = false;
            for (PaymentPlanInstallment inst : plan.getInstallments()) {
                if (inst.getStatus() == InstallmentStatus.PENDING
                        && inst.getDueDate().isBefore(today)) {
                    inst.setStatus(InstallmentStatus.OVERDUE);
                    inst.setUpdatedAt(now);
                    newlyOverdue.add(inst);
                    changed = true;
                }
            }
            if (!changed) continue;
            affected++;
            plan.setUpdatedAt(now);
            planRepository.save(plan);

            for (PaymentPlanInstallment inst : newlyOverdue) {
                historyRepository.save(DebtHistory.builder()
                        .debt(plan.getDebt())
                        .eventType("INSTALLMENT_OVERDUE")
                        .description("Tranche n°" + inst.getInstallmentNumber()
                                + " de l'échéancier " + plan.getReference()
                                + " échue le " + inst.getDueDate()
                                + " (montant " + inst.getAmount() + " MGA) non réglée")
                        .oldValue(InstallmentStatus.PENDING.name())
                        .newValue(InstallmentStatus.OVERDUE.name())
                        .performedBy("system")
                        .eventDate(now)
                        .createdAt(now)
                        .build());
            }
            if (plan.getDebt().getTaxpayer() != null) {
                notificationService.notifyTaxpayer(plan.getDebt().getTaxpayer().getUserId(),
                        NotificationType.INSTALLMENT_OVERDUE,
                        "Tranche d'échéancier en retard - " + plan.getReference(),
                        "L'échéancier " + plan.getReference() + " de la créance "
                                + plan.getDebt().getReference() + " comporte "
                                + newlyOverdue.size() + " tranche(s) échue(s) non réglée(s).",
                        "PAYMENT_PLAN", plan.getReference());
            }
        }
        return affected;
    }

    @Transactional(readOnly = true)
    public long countOverduePlans(LocalDate today) {
        return planRepository.countActiveWithOverdueInstallments(PaymentPlanStatus.ACTIVE, today);
    }

    private PaymentPlan find(Long id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Échéancier", id));
    }
}
