package com.mnktax.common.scheduler;

import com.mnktax.debt.service.DebtService;
import com.mnktax.paymentplan.service.PaymentPlanService;
import com.mnktax.tax.service.TaxObligationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Scheduler dédié aux tâches fiscales automatisées :
 * - Détection des créances en retard (markOverdue)
 * - Mise à jour des statuts d'obligations (OVERDUE, TERMINATED)
 *
 * Séparé du NotificationService pour une meilleure séparation des responsabilités.
 */
@Service
public class FiscalSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(FiscalSchedulerService.class);

    private final DebtService debtService;
    private final TaxObligationService obligationService;
    private final PaymentPlanService paymentPlanService;

    public FiscalSchedulerService(@Lazy DebtService debtService,
                                  @Lazy TaxObligationService obligationService,
                                  PaymentPlanService paymentPlanService) {
        this.debtService = debtService;
        this.obligationService = obligationService;
        this.paymentPlanService = paymentPlanService;
    }

    /**
     * Tâche quotidienne à 06h30 : détection des retards et mise à jour des statuts.
     */
    @Scheduled(cron = "${mnk-tax.scheduler.overdue-cron:0 30 6 * * *}")
    @Transactional
    public void dailyOverdueCheck() {
        LocalDate today = LocalDate.now();
        int overdueCount = 0;
        int obligationsOverdue = 0;
        int obligationsTerminated = 0;

        try {
            var result = debtService.markOverdue(today, null, null, null, null, null, null, null);
            overdueCount = result.updated();
            if (overdueCount > 0) {
                log.info("Détection retards : {} créances passées en OVERDUE", overdueCount);
            }
        } catch (Exception ex) {
            log.error("Echec détection créances en retard", ex);
        }

        try {
            obligationsOverdue = obligationService.markOverdueObligations(today);
            if (obligationsOverdue > 0) {
                log.info("Obligations : {} obligations avec paiement en retard", obligationsOverdue);
            }
        } catch (Exception ex) {
            log.error("Echec mise à jour obligations en retard", ex);
        }

        try {
            obligationsTerminated = obligationService.terminateExpired(today);
            if (obligationsTerminated > 0) {
                log.info("Obligations : {} obligations expirées clôturées", obligationsTerminated);
            }
        } catch (Exception ex) {
            log.error("Echec clôture obligations expirées", ex);
        }

        int plansOverdue = 0;
        try {
            plansOverdue = paymentPlanService.markOverdueInstallments(today);
            if (plansOverdue > 0) {
                log.info("Échéanciers : {} plan(s) avec tranche(s) échue(s) non réglée(s)", plansOverdue);
            }
        } catch (Exception ex) {
            log.error("Echec détection tranches d'échéancier en retard", ex);
        }

        if (overdueCount + obligationsOverdue + obligationsTerminated + plansOverdue > 0) {
            log.info("Résumé scheduler fiscal : {} créances OVERDUE, {} obligations OVERDUE, {} obligations TERMINATED, {} échéanciers en retard",
                    overdueCount, obligationsOverdue, obligationsTerminated, plansOverdue);
        }
    }
}
