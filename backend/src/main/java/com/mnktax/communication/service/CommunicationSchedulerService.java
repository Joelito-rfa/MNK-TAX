package com.mnktax.communication.service;

import com.mnktax.communication.entity.CommunicationEventRule;
import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.repository.CommunicationEventRuleRepository;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.message.entity.MessageContextType;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.paymentplan.entity.InstallmentStatus;
import com.mnktax.paymentplan.entity.PaymentPlanInstallment;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import com.mnktax.paymentplan.repository.PaymentPlanRepository;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.entity.TaxObligation;
import com.mnktax.tax.repository.DeadlineRepository;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Relances automatiques quotidiennes (règles configurables dans
 * communication_event_rules — jamais codées dans le frontend).
 *
 * - DECLARATION_DUE_SOON : obligations NON_SUBMITTED dont l'échéance approche
 *   (fenêtre de la règle, ex : J-3) → rappel multicanal.
 * - DEBT_OVERDUE_RELANCE : créances en retard depuis ≈ J+7 (fenêtre J+7..J+13)
 *   → relance.
 * - FORMAL_NOTICE : créances en retard depuis ≈ J+15 (fenêtre J+15..J+21)
 *   → mise en demeure.
 *
 * Anti-doublon : un contribuable n'est relancé que s'il n'a reçu aucune
 * communication automatique récente (3 jours) pour le même type d'événement.
 * Les délais (J-3, J+7, J+15…) viennent des règles activées — configuration
 * métier modifiable dans Paramètres → Communications.
 */
@Service
public class CommunicationSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(CommunicationSchedulerService.class);

    private final TaxObligationRepository obligationRepository;
    private final TaxDebtRepository debtRepository;
    private final DeadlineRepository deadlineRepository;
    private final CommunicationEventRuleRepository ruleRepository;
    private final PaymentPlanRepository planRepository;
    private final CommunicationService communicationService;
    private final CommunicationEventEngine eventEngine;

    public CommunicationSchedulerService(TaxObligationRepository obligationRepository,
                                         TaxDebtRepository debtRepository,
                                         DeadlineRepository deadlineRepository,
                                         CommunicationEventRuleRepository ruleRepository,
                                         PaymentPlanRepository planRepository,
                                         @org.springframework.context.annotation.Lazy CommunicationService communicationService,
                                         CommunicationEventEngine eventEngine) {
        this.obligationRepository = obligationRepository;
        this.debtRepository = debtRepository;
        this.deadlineRepository = deadlineRepository;
        this.ruleRepository = ruleRepository;
        this.planRepository = planRepository;
        this.communicationService = communicationService;
        this.eventEngine = eventEngine;
    }

    /** Quotidien à 07h15 (après la détection de retards de 06h30). */
    @Scheduled(cron = "${mnk-tax.scheduler.communication-cron:0 15 7 * * *}",
            zone = "${mnk-tax.scheduler.zone:Indian/Antananarivo}")
    public void dailyCommunicationCheck() {
        runDailyChecks(LocalDate.now());
    }

    /**
     * Exécution déterministe (testable) de tous les rappels pour une date donnée.
     * La date est injectée — jamais codée en dur dans la logique.
     */
    void runDailyChecks(LocalDate today) {
        try {
            notifyDeclarationReminders(today);
        } catch (Exception ex) {
            log.error("Échec des rappels d'échéance de déclaration", ex);
        }
        try {
            notifyPaymentReminders(today);
        } catch (Exception ex) {
            log.error("Échec des rappels d'échéance de paiement", ex);
        }
        try {
            notifyDebtRelances(today);
        } catch (Exception ex) {
            log.error("Échec des relances de créances", ex);
        }
        try {
            notifyInstallmentOverdues(today);
        } catch (Exception ex) {
            log.error("Échec des relances de tranches d'échéancier", ex);
        }
    }

    /**
     * Rappels d'échéance de DÉCLARATION. Le calendrier fiscal (table deadlines)
     * fait foi : la date effective retenue est celle du calendrier quand une ligne
     * correspond à l'impôt + période, sinon la date portée par l'obligation
     * (repli sans régression). Les paliers J-7 / J-3 / J-1 / J-0 viennent des
     * règles en base, jamais du code.
     */
    private void notifyDeclarationReminders(LocalDate today) {
        Set<Integer> offsets = dueOffsets(CommunicationEventType.DECLARATION_DUE_SOON);
        if (offsets.isEmpty()) {
            return;
        }
        List<TaxObligation> obligations = obligationRepository.findDueBetween(
                today, today.plusDays(maxOffset(offsets)));
        if (obligations.isEmpty()) {
            return;
        }
        Map<String, Deadline> calendar = deadlineIndex();
        int sent = 0;
        for (TaxObligation obligation : obligations) {
            if (obligation.getTaxpayer() == null || obligation.getTaxpayer().getUserId() == null) {
                continue;
            }
            Deadline deadline = calendar.get(key(obligation.getTaxType().getCode(), obligation.getPeriod()));
            LocalDate effective = deadline != null
                    ? deadline.getDeclarationDeadline() : obligation.getDeclarationDeadline();
            if (effective == null) {
                continue;
            }
            int daysUntilDue = (int) ChronoUnit.DAYS.between(today, effective);
            if (!offsets.contains(daysUntilDue)) {
                continue;
            }
            String contextRef = refBase(deadline, obligation) + ":declaration:" + (-daysUntilDue);
            if (communicationService.deadlineReminderSent(obligation.getTaxpayer().getId(), contextRef)) {
                continue;
            }
            Map<String, String> variables = new HashMap<>();
            variables.put("declaration_reference",
                    obligation.getTaxType().getCode() + " " + obligation.getPeriod());
            variables.put("due_date", effective.toString());
            variables.put("amount", obligation.getExpectedAmount() == null ? "0"
                    : obligation.getExpectedAmount().toPlainString());
            eventEngine.onEvent(CommunicationEventType.DECLARATION_DUE_SOON, obligation.getTaxpayer(),
                    variables, MessageContextType.DEADLINE, contextRef);
            sent++;
        }
        if (sent > 0) {
            log.info("Rappels d'échéance de déclaration : {} envoi(s)", sent);
        }
    }

    /**
     * Rappels d'échéance de PAIEMENT (obligations restant à régler). Même logique
     * de source de vérité calendaire et de paliers configurables J-7…J-0.
     */
    private void notifyPaymentReminders(LocalDate today) {
        Set<Integer> offsets = dueOffsets(CommunicationEventType.PAYMENT_DUE_SOON);
        if (offsets.isEmpty()) {
            return;
        }
        List<TaxObligation> obligations = obligationRepository.findPaymentDueBetween(
                today, today.plusDays(maxOffset(offsets)));
        if (obligations.isEmpty()) {
            return;
        }
        Map<String, Deadline> calendar = deadlineIndex();
        int sent = 0;
        for (TaxObligation obligation : obligations) {
            if (obligation.getTaxpayer() == null || obligation.getTaxpayer().getUserId() == null) {
                continue;
            }
            Deadline deadline = calendar.get(key(obligation.getTaxType().getCode(), obligation.getPeriod()));
            LocalDate effective = deadline != null
                    ? deadline.getPaymentDeadline() : obligation.getPaymentDeadline();
            if (effective == null) {
                continue;
            }
            int daysUntilDue = (int) ChronoUnit.DAYS.between(today, effective);
            if (!offsets.contains(daysUntilDue)) {
                continue;
            }
            String contextRef = refBase(deadline, obligation) + ":payment:" + (-daysUntilDue);
            if (communicationService.deadlineReminderSent(obligation.getTaxpayer().getId(), contextRef)) {
                continue;
            }
            Map<String, String> variables = new HashMap<>();
            variables.put("payment_reference",
                    obligation.getTaxType().getCode() + " " + obligation.getPeriod());
            variables.put("due_date", effective.toString());
            variables.put("amount", obligation.getExpectedAmount() == null ? "0"
                    : obligation.getExpectedAmount().toPlainString());
            eventEngine.onEvent(CommunicationEventType.PAYMENT_DUE_SOON, obligation.getTaxpayer(),
                    variables, MessageContextType.DEADLINE, contextRef);
            sent++;
        }
        if (sent > 0) {
            log.info("Rappels d'échéance de paiement : {} envoi(s)", sent);
        }
    }

    /** Paliers avant échéance (règles activées) : J-7, J-3, J-1, J-0 → {7,3,1,0}. */
    private Set<Integer> dueOffsets(CommunicationEventType eventType) {
        return ruleRepository.findByEventTypeAndEnabledTrue(eventType).stream()
                .map(CommunicationEventRule::getDayOffset)
                .filter(Objects::nonNull)
                .filter(off -> off <= 0)
                .map(off -> -off)
                .collect(Collectors.toSet());
    }

    private static int maxOffset(Set<Integer> offsets) {
        return offsets.stream().mapToInt(Integer::intValue).max().orElse(0);
    }

    /** Indexe le calendrier par impôt + période (source de vérité des dates). */
    private Map<String, Deadline> deadlineIndex() {
        Map<String, Deadline> index = new HashMap<>();
        for (Deadline deadline : deadlineRepository.findAllFetchTaxType()) {
            if (deadline.getTaxType() == null) {
                continue;
            }
            index.put(key(deadline.getTaxType().getCode(), deadline.getPeriod()), deadline);
        }
        return index;
    }

    private static String key(String taxTypeCode, String period) {
        return (taxTypeCode == null ? "" : taxTypeCode) + "|" + (period == null ? "" : period);
    }

    /** Référence de base de l'anti-doublon : ligne calendrier sinon obligation. */
    private static String refBase(Deadline deadline, TaxObligation obligation) {
        return deadline != null ? String.valueOf(deadline.getId()) : "O" + obligation.getId();
    }

    private void notifyDebtRelances(LocalDate today) {
        // Créances OVERDUE : relances escaladées à J+7, J+15, J+30, J+60.
        // Chaque créance ne reçoit qu''une seule communication par cycle (anti-doublon).
        // Les relances continuent même après la mise en demeure (J+15) pour s''assurer
        // que le contribuable est bien notifié sur tous les canaux.
        List<TaxDebt> overdue = debtRepository.findByStatusAndDueDateBefore(
                com.mnktax.debt.entity.DebtStatus.OVERDUE, today.plusDays(1));
        Set<Long> notified = new HashSet<>();
        int relances = 0;
        int formalNotices = 0;
        int relances30 = 0;
        int relances60 = 0;
        for (TaxDebt debt : overdue) {
            if (debt.getTaxpayer() == null || debt.getTaxpayer().getUserId() == null) continue;
            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(debt.getDueDate(), today);
            if (daysOverdue < 7) continue;
            if (notified.contains(debt.getTaxpayer().getId())) continue;

            Map<String, String> variables = new HashMap<>();
            variables.put("debt_reference", debt.getReference());
            variables.put("amount", debt.getBalance() == null ? "0" : debt.getBalance().toPlainString());
            variables.put("due_date", debt.getDueDate().toString());

            // Escalade : relance initiale → mise en demeure → relance 30j → relance 60j
            // Chaque palier utilise un type d''événement différent pour l''anti-doublon.
            if (daysOverdue >= 60) {
                // Dernière relance (J+60+), tous canaux IN_APP/EMAIL/SMS
                if (recentlyNotified(debt.getTaxpayer().getId(),
                        CommunicationEventType.DEBT_OVERDUE_RELANCE_60.name())) {
                    continue;
                }
                eventEngine.onEvent(CommunicationEventType.DEBT_OVERDUE_RELANCE_60, debt.getTaxpayer(), variables);
                relances60++;
            } else if (daysOverdue >= 30) {
                // Relance à 30 jours, tous canaux IN_APP/EMAIL/SMS
                if (recentlyNotified(debt.getTaxpayer().getId(),
                        CommunicationEventType.DEBT_OVERDUE_RELANCE_30.name())) {
                    continue;
                }
                eventEngine.onEvent(CommunicationEventType.DEBT_OVERDUE_RELANCE_30, debt.getTaxpayer(), variables);
                relances30++;
            } else if (daysOverdue >= 15) {
                // Mise en demeure (J+15..J+29), tous canaux IN_APP/EMAIL/SMS
                if (recentlyNotified(debt.getTaxpayer().getId(),
                        CommunicationEventType.FORMAL_NOTICE.name())) {
                    continue;
                }
                eventEngine.onEvent(CommunicationEventType.FORMAL_NOTICE, debt.getTaxpayer(), variables);
                formalNotices++;
            } else {
                // Relance initiale (J+7..J+14), tous canaux IN_APP/EMAIL/SMS
                if (recentlyNotified(debt.getTaxpayer().getId(),
                        CommunicationEventType.DEBT_OVERDUE_RELANCE.name())) {
                    continue;
                }
                eventEngine.onEvent(CommunicationEventType.DEBT_OVERDUE_RELANCE, debt.getTaxpayer(), variables);
                relances++;
            }
            notified.add(debt.getTaxpayer().getId());
        }
        if (relances + formalNotices + relances30 + relances60 > 0) {
            log.info("Relances : {} initiale(s), {} mise(s) en demeure, {} relance(s) 30j, {} relance(s) 60j",
                    relances, formalNotices, relances30, relances60);
        }
    }

    // ── Relances d'échéanciers (tranches en retard) ──────────

    /**
     * Relances automatiques pour les tranches d'échéancier en retard :
     * J+1 → rappel initial, J+3 → relance, J+7 → alerte urgente.
     * Tous canaux (IN_APP, EMAIL, SMS) — configurables dans les règles.
     */
    private void notifyInstallmentOverdues(LocalDate today) {
        // Les tranches sont marquées OVERDUE par le scheduler fiscal à 06h30.
        // On les détecte ici à 07h15 pour envoyer les communications.
        List<PaymentPlanInstallment> overdueInstallments = planRepository.findOverdueInstallmentsForNotification(
                PaymentPlanStatus.ACTIVE, today);
        if (overdueInstallments.isEmpty()) {
            return;
        }

        // Groupement par contribuable pour éviter les doublons :
        // un contribuable ne reçoit qu'une seule communication par palier (J+1, J+3, J+7).
        // On traite la tranche la plus ancienne (dueDate la plus ancienne) en priorité.
        record InstallmentKey(Long taxpayerId, int dayOffset) {}
        Map<InstallmentKey, PaymentPlanInstallment> oldestByTaxpayer = new HashMap<>();

        for (PaymentPlanInstallment inst : overdueInstallments) {
            if (inst.getPlan() == null || inst.getPlan().getDebt() == null) continue;
            Taxpayer taxpayer = inst.getPlan().getDebt().getTaxpayer();
            if (taxpayer == null || taxpayer.getUserId() == null) continue;

            int daysOverdue = (int) java.time.temporal.ChronoUnit.DAYS.between(inst.getDueDate(), today);
            // On cible les paliers J+1, J+3, J+7 (anti-doublon par 3 jours).
            if (daysOverdue < 1) continue;

            // Déterminer le palier applicable : la plus petite fenêtre >= daysOverdue
            Integer targetOffset = matchInstallmentOffset(daysOverdue);
            if (targetOffset == null) continue;

            InstallmentKey key = new InstallmentKey(taxpayer.getId(), targetOffset);
            // Conserver la tranche la plus ancienne par palier et contribuable
            PaymentPlanInstallment existing = oldestByTaxpayer.get(key);
            if (existing == null || inst.getDueDate().isBefore(existing.getDueDate())) {
                oldestByTaxpayer.put(key, inst);
            }
        }

        int sent = 0;
        for (Map.Entry<InstallmentKey, PaymentPlanInstallment> entry : oldestByTaxpayer.entrySet()) {
            InstallmentKey key = entry.getKey();
            PaymentPlanInstallment inst = entry.getValue();
            Taxpayer taxpayer = inst.getPlan().getDebt().getTaxpayer();

            CommunicationEventType eventType = switch (key.dayOffset()) {
                case 1 -> CommunicationEventType.INSTALLMENT_OVERDUE_J1;
                case 3 -> CommunicationEventType.INSTALLMENT_OVERDUE_J3;
                case 7 -> CommunicationEventType.INSTALLMENT_OVERDUE_J7;
                default -> null;
            };
            if (eventType == null) continue;

            if (recentlyNotified(taxpayer.getId(), eventType.name())) {
                continue;
            }

            Map<String, String> variables = new HashMap<>();
            variables.put("plan_reference", inst.getPlan().getReference());
            variables.put("debt_reference", inst.getPlan().getDebt().getReference());
            variables.put("installment_number", String.valueOf(inst.getInstallmentNumber()));
            variables.put("amount", inst.getAmount() == null ? "0" : inst.getAmount().toPlainString());
            variables.put("due_date", inst.getDueDate().toString());
            variables.put("days_overdue", String.valueOf(key.dayOffset()));
            // Solde restant de la créance
            variables.put("balance", inst.getPlan().getDebt().getBalance() == null
                    ? "0" : inst.getPlan().getDebt().getBalance().toPlainString());

            eventEngine.onEvent(eventType, taxpayer, variables);
            sent++;
        }
        if (sent > 0) {
            log.info("Relances échéanciers : {} contribuable(s) notifié(s) pour tranches en retard", sent);
        }
    }

    /**
     * Associe le nombre de jours de retard au palier de relance applicable.
     * Renvoie null si aucun palier ne correspond (hors fenêtre J+1..J+7).
     */
    private Integer matchInstallmentOffset(int daysOverdue) {
        if (daysOverdue >= 7) return 7;
        if (daysOverdue >= 3) return 3;
        if (daysOverdue >= 1) return 1;
        return null;
    }

    /** Anti-doublon : vrai si une communication automatique récente existe (3 jours). */
    private boolean recentlyNotified(Long taxpayerId, String eventType) {
        return !communicationService.findRecentAutomatic(
                taxpayerId, eventType, java.time.Instant.now().minus(java.time.Duration.ofDays(3))).isEmpty();
    }
}
