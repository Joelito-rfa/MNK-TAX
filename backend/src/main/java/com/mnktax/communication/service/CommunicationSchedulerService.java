package com.mnktax.communication.service;

import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.repository.CommunicationEventRuleRepository;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.paymentplan.entity.InstallmentStatus;
import com.mnktax.paymentplan.entity.PaymentPlanInstallment;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import com.mnktax.paymentplan.repository.PaymentPlanRepository;
import com.mnktax.tax.entity.TaxObligation;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
    private final CommunicationEventRuleRepository ruleRepository;
    private final PaymentPlanRepository planRepository;
    private final CommunicationService communicationService;
    private final CommunicationEventEngine eventEngine;

    public CommunicationSchedulerService(TaxObligationRepository obligationRepository,
                                         TaxDebtRepository debtRepository,
                                         CommunicationEventRuleRepository ruleRepository,
                                         PaymentPlanRepository planRepository,
                                         @org.springframework.context.annotation.Lazy CommunicationService communicationService,
                                         CommunicationEventEngine eventEngine) {
        this.obligationRepository = obligationRepository;
        this.debtRepository = debtRepository;
        this.ruleRepository = ruleRepository;
        this.planRepository = planRepository;
        this.communicationService = communicationService;
        this.eventEngine = eventEngine;
    }

    /** Quotidien à 07h15 (après la détection de retards de 06h30). */
    @Scheduled(cron = "${mnk-tax.scheduler.communication-cron:0 15 7 * * *}",
            zone = "${mnk-tax.scheduler.zone:Indian/Antananarivo}")
    public void dailyCommunicationCheck() {
        LocalDate today = LocalDate.now();
        try {
            notifyDeclarationsDueSoon(today);
        } catch (Exception ex) {
            log.error("Échec des rappels d'échéance de déclaration", ex);
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

    private void notifyDeclarationsDueSoon(LocalDate today) {
        // Jours ciblés par les règles activées (ex : règle J-3 → rappel à J-3).
        // Les délais restent dans la configuration métier, jamais en dur.
        Set<Integer> targetOffsets = ruleRepository.findByEventTypeAndEnabledTrue(
                        CommunicationEventType.DECLARATION_DUE_SOON).stream()
                .map(r -> r.getDayOffset())
                .filter(java.util.Objects::nonNull)
                .filter(off -> off <= 0)                      // J-0, J-1, J-3… (négatif = avant échéance)
                .map(off -> -off)
                .collect(java.util.stream.Collectors.toSet());
        if (targetOffsets.isEmpty()) {
            return;
        }
        List<TaxObligation> upcoming =
                obligationRepository.findDueBetween(today, today.plusDays(15));
        Map<Long, TaxObligation> earliestByTaxpayer = new HashMap<>();
        for (TaxObligation obligation : upcoming) {
            if (obligation.getTaxpayer() == null || obligation.getTaxpayer().getUserId() == null) {
                continue;
            }
            int daysUntilDue = (int) java.time.temporal.ChronoUnit.DAYS
                    .between(today, obligation.getDeclarationDeadline());
            if (!targetOffsets.contains(daysUntilDue)) {
                continue;
            }
            TaxObligation existing = earliestByTaxpayer.get(obligation.getTaxpayer().getId());
            if (existing == null || obligation.getDeclarationDeadline().isBefore(existing.getDeclarationDeadline())) {
                earliestByTaxpayer.put(obligation.getTaxpayer().getId(), obligation);
            }
        }
        int sent = 0;
        for (Map.Entry<Long, TaxObligation> entry : earliestByTaxpayer.entrySet()) {
            TaxObligation obligation = entry.getValue();
            if (recentlyNotified(obligation.getTaxpayer().getId(), CommunicationEventType.DECLARATION_DUE_SOON.name())) {
                continue;
            }
            Map<String, String> variables = new HashMap<>();
            variables.put("declaration_reference", obligation.getTaxType().getCode() + " " + obligation.getPeriod());
            variables.put("due_date", obligation.getDeclarationDeadline().toString());
            variables.put("amount", obligation.getExpectedAmount() == null ? "0"
                    : obligation.getExpectedAmount().toPlainString());
            eventEngine.onEvent(CommunicationEventType.DECLARATION_DUE_SOON, obligation.getTaxpayer(), variables);
            sent++;
        }
        if (sent > 0) {
            log.info("Rappels d'échéance : {} contribuable(s) notifié(s)", sent);
        }
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
