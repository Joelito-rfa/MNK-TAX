package com.mnktax.communication.service;

import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.repository.CommunicationEventRuleRepository;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.tax.entity.TaxObligation;
import com.mnktax.tax.repository.TaxObligationRepository;
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
    private final CommunicationService communicationService;
    private final CommunicationEventEngine eventEngine;

    public CommunicationSchedulerService(TaxObligationRepository obligationRepository,
                                         TaxDebtRepository debtRepository,
                                         CommunicationEventRuleRepository ruleRepository,
                                         @org.springframework.context.annotation.Lazy CommunicationService communicationService,
                                         CommunicationEventEngine eventEngine) {
        this.obligationRepository = obligationRepository;
        this.debtRepository = debtRepository;
        this.ruleRepository = ruleRepository;
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
        // Créances OVERDUE depuis 7 à 21 jours : relance à J+7, mise en demeure à J+15.
        List<TaxDebt> overdue = debtRepository.findByStatusAndDueDateBefore(
                com.mnktax.debt.entity.DebtStatus.OVERDUE, today.plusDays(1));
        Set<Long> notified = new HashSet<>();
        int relances = 0;
        int formalNotices = 0;
        for (TaxDebt debt : overdue) {
            if (debt.getTaxpayer() == null || debt.getTaxpayer().getUserId() == null) continue;
            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(debt.getDueDate(), today);
            if (daysOverdue < 7 || daysOverdue > 21) continue;
            if (notified.contains(debt.getTaxpayer().getId())) continue;

            Map<String, String> variables = new HashMap<>();
            variables.put("debt_reference", debt.getReference());
            variables.put("amount", debt.getBalance() == null ? "0" : debt.getBalance().toPlainString());
            variables.put("due_date", debt.getDueDate().toString());

            // 1 relance (J+7..J+13) puis 1 mise en demeure (J+15..J+21) par créance,
            // grâce au garde-fou anti-doublon findRecentAutomatic.
            if (daysOverdue <= 13) {
                if (recentlyNotified(debt.getTaxpayer().getId(),
                        CommunicationEventType.DEBT_OVERDUE_RELANCE.name())) {
                    continue;
                }
                eventEngine.onEvent(CommunicationEventType.DEBT_OVERDUE_RELANCE, debt.getTaxpayer(), variables);
                relances++;
            } else {
                if (recentlyNotified(debt.getTaxpayer().getId(),
                        CommunicationEventType.FORMAL_NOTICE.name())) {
                    continue;
                }
                eventEngine.onEvent(CommunicationEventType.FORMAL_NOTICE, debt.getTaxpayer(), variables);
                formalNotices++;
            }
            notified.add(debt.getTaxpayer().getId());
        }
        if (relances + formalNotices > 0) {
            log.info("Relances : {} relance(s), {} mise(s) en demeure", relances, formalNotices);
        }
    }

    /** Anti-doublon : vrai si une communication automatique récente existe (3 jours). */
    private boolean recentlyNotified(Long taxpayerId, String eventType) {
        return !communicationService.findRecentAutomatic(
                taxpayerId, eventType, java.time.Instant.now().minus(java.time.Duration.ofDays(3))).isEmpty();
    }
}
