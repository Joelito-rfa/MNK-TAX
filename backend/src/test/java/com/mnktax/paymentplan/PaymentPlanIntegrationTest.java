package com.mnktax.paymentplan;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.payment.dto.PaymentDtos.CancelPaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.service.PaymentService;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.CancelPlanRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.CreatePlanRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.InstallmentRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.PlanDto;
import com.mnktax.paymentplan.entity.InstallmentStatus;
import com.mnktax.paymentplan.entity.PaymentPlan;
import com.mnktax.paymentplan.entity.PaymentPlanInstallment;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import com.mnktax.paymentplan.repository.PaymentPlanRepository;
import com.mnktax.paymentplan.service.PaymentPlanService;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Échéanciers (plans de paiement) : les tranches sont soldées par les
 * paiements réels ; une tranche échue non réglée passe OVERDUE par la
 * détection quotidienne (alerte), jamais automatiquement vers une procédure.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PaymentPlanIntegrationTest {

    @Autowired private TaxCenterRepository centerRepository;
    @Autowired private TaxRegimeRepository regimeRepository;
    @Autowired private TaxTypeRepository taxTypeRepository;
    @Autowired private TaxpayerRepository taxpayerRepository;
    @Autowired private TaxDebtRepository debtRepository;
    @Autowired private DebtHistoryRepository historyRepository;
    @Autowired private DebtService debtService;
    @Autowired private PaymentService paymentService;
    @Autowired private PaymentPlanRepository planRepository;
    @Autowired private PaymentPlanService planService;

    private Taxpayer company;
    private long next = 1;

    @BeforeEach
    void setUp() {
        if (taxpayerRepository.count() > 0) {
            return;
        }
        TaxCenter center = centerRepository.save(TaxCenter.builder()
                .code("CEN-PLAN-TEST").name("Centre échéanciers test").address("Test (fictif)")
                .createdAt(Instant.now()).build());
        TaxRegime regime = regimeRepository.save(TaxRegime.builder()
                .code("REG-PLAN-TEST").name("Régime échéanciers test").category("REEL")
                .vatApplicable(true).build());
        taxTypeRepository.findByCode("TVA").orElseGet(() ->
                taxTypeRepository.save(TaxType.builder()
                        .code("TVA").name("TVA - DÉMO").category("DEMO").active(true).build()));
        company = taxpayerRepository.save(Taxpayer.builder()
                .nif("0000553302").type(TaxpayerType.COMPANY).name("Société Échéanciers Test")
                .email("plan@demo.mg").phone("0322222222").address("Adresse fictive")
                .taxCenter(center).taxRegime(regime)
                .status(TaxpayerStatus.ACTIVE)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build());
    }

    private TaxDebt manualDebt(BigDecimal principal) {
        String period = LocalDate.now().getYear() + "-"
                + String.format("%02d", LocalDate.now().getMonthValue());
        TaxDebt debt = debtService.createManual(company.getId(), "TVA", period,
                principal, "Dette pour test échéancier", DebtCollectionPriority.NORMAL);
        // Échéance future pour ne pas déclencher de pénalités dans ce test
        debt.setDueDate(LocalDate.now().plusDays(90));
        debt.setLastDueDate(debt.getDueDate());
        debt.setUpdatedAt(Instant.now());
        return debtRepository.save(debt);
    }

    private List<InstallmentRequest> threeInstallments() {
        LocalDate t = LocalDate.now();
        return List.of(
                new InstallmentRequest(t.plusDays(10), new BigDecimal("100000")),
                new InstallmentRequest(t.plusDays(20), new BigDecimal("100000")),
                new InstallmentRequest(t.plusDays(30), new BigDecimal("100000")));
    }

    @Test
    @DisplayName("Création : gardes métier (solde insuffisant, dates passées, doublon actif)")
    void creationGuards() {
        TaxDebt debt = manualDebt(new BigDecimal("200000"));
        LocalDate t = LocalDate.now();

        // Montant supérieur au solde
        BusinessException tooBig = assertThrows(BusinessException.class, () -> planService.create(
                new CreatePlanRequest(debt.getId(), "Plan trop grand", null,
                        List.of(new InstallmentRequest(t.plusDays(10), new BigDecimal("250000")))), null));
        assertEquals("PLAN_EXCEEDS_BALANCE", tooBig.getCode());

        // Tranche datée dans le passé
        BusinessException past = assertThrows(BusinessException.class, () -> planService.create(
                new CreatePlanRequest(debt.getId(), "Plan rétroactif", null,
                        List.of(new InstallmentRequest(t.minusDays(1), new BigDecimal("100000")))), null));
        assertEquals("INSTALLMENT_DATE_IN_PAST", past.getCode());

        // Plan valide
        PlanDto ok = planService.create(new CreatePlanRequest(debt.getId(), "Plan de test", null,
                List.of(new InstallmentRequest(t.plusDays(10), new BigDecimal("200000")))), null);
        assertEquals("ACTIVE", ok.status().name());

        // Second plan actif sur la même créance
        BusinessException dup = assertThrows(BusinessException.class, () -> planService.create(
                new CreatePlanRequest(debt.getId(), "Doublon", null,
                        List.of(new InstallmentRequest(t.plusDays(20), new BigDecimal("50000")))), null));
        assertEquals("PLAN_ALREADY_ACTIVE", dup.getCode());
    }

    @Test
    @DisplayName("Les paiements réels soldent les tranches dans l'ordre, puis clôturent l'échéancier")
    void paymentsDriveInstallments() {
        TaxDebt debt = manualDebt(new BigDecimal("300000"));
        PlanDto plan = planService.create(new CreatePlanRequest(debt.getId(), "Régularisation en 3 fois",
                "Suite à accord amiable",
                threeInstallments()), null);

        // Paiement 1 : 100 000 → tranche 1 payée
        paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("100000"),
                LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        PlanDto afterP1 = planService.get(plan.id());
        assertEquals(InstallmentStatus.PAID, afterP1.installments().get(0).status());
        assertEquals(InstallmentStatus.PENDING, afterP1.installments().get(1).status());
        assertEquals("100000.00", afterP1.paidAmount().toPlainString());

        // Paiement 2 : 50 000 → tranche 2 partiellement payée
        paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("50000"),
                LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        PlanDto afterP2 = planService.get(plan.id());
        assertEquals(InstallmentStatus.PARTIALLY_PAID, afterP2.installments().get(1).status());
        assertEquals("50000.00", afterP2.installments().get(1).paidAmount().toPlainString());

        // Paiement 3 : 150 000 → solde de la tranche 2 + tranche 3 → échéancier COMPLETED
        paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("150000"),
                LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        PlanDto afterP3 = planService.get(plan.id());
        assertEquals(PaymentPlanStatus.COMPLETED, afterP3.status());
        assertTrue(afterP3.installments().stream().allMatch(i -> i.status() == InstallmentStatus.PAID));

        TaxDebt paid = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.PAID, paid.getStatus());
        assertEquals(0, paid.getBalance().compareTo(BigDecimal.ZERO));
    }

    @Test
    @DisplayName("FIFO : un paiement solde d'abord la tranche due la plus ancienne, jamais la plus petite")
    void paymentSettlesOldestDueInstallmentFirst() {
        TaxDebt debt = manualDebt(new BigDecimal("350000"));
        LocalDate t = LocalDate.now();
        // Montants volontairement non triés : l'affectation suit la date
        // d'échéance (la plus ancienne d'abord), pas le montant.
        PlanDto plan = planService.create(new CreatePlanRequest(debt.getId(), "Échéancier FIFO", null,
                List.of(
                        new InstallmentRequest(t.plusDays(30), new BigDecimal("50000")),
                        new InstallmentRequest(t.plusDays(10), new BigDecimal("100000")),
                        new InstallmentRequest(t.plusDays(20), new BigDecimal("200000")))), null);
        assertEquals(3, plan.installments().size());
        // L'ordre interne suit les échéances : 100 000 → 200 000 → 50 000
        assertEquals(0, new BigDecimal("100000").compareTo(plan.installments().get(0).amount()));
        assertEquals(0, new BigDecimal("200000").compareTo(plan.installments().get(1).amount()));
        assertEquals(0, new BigDecimal("50000").compareTo(plan.installments().get(2).amount()));

        // Paiement de 120 000 : la tranche 1 (100 000) est réglée, l'excédent
        // entame la tranche 2 — la tranche 3 (50 000, plus petite mais plus
        // récente) ne reçoit rien.
        paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("120000"),
                LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        PlanDto afterP1 = planService.get(plan.id());
        assertEquals(InstallmentStatus.PAID, afterP1.installments().get(0).status());
        assertEquals(InstallmentStatus.PARTIALLY_PAID, afterP1.installments().get(1).status());
        assertEquals(0, new BigDecimal("20000").compareTo(afterP1.installments().get(1).paidAmount()));
        assertEquals(InstallmentStatus.PENDING, afterP1.installments().get(2).status());

        // Paiement du solde (230 000) : tout est réglé, l'échéancier se clôt.
        paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("230000"),
                LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        PlanDto done = planService.get(plan.id());
        assertEquals(PaymentPlanStatus.COMPLETED, done.status());
        assertTrue(done.installments().stream().allMatch(i -> i.status() == InstallmentStatus.PAID));

        // Traces append-only : chaque tranche soldée apparaît dans le journal.
        long paidTraces = historyRepository.findByDebtIdOrderByEventDateDesc(debt.getId()).stream()
                .filter(h -> "INSTALLMENT_PAID".equals(h.getEventType())).count();
        assertTrue(paidTraces >= 3, "Une trace INSTALLMENT_PAID par tranche réglée doit exister");
    }

    @Test
    @DisplayName("FIFO : annuler un paiement rouvre les tranches les plus récentes en premier")
    void cancellingPaymentReopensInstallmentsFromTheEnd() {
        TaxDebt debt = manualDebt(new BigDecimal("300000"));
        PlanDto plan = planService.create(new CreatePlanRequest(debt.getId(), "Échéancier réversible", null,
                threeInstallments()), null);

        var payment = paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("150000"),
                LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        PlanDto partial = planService.get(plan.id());
        assertEquals(InstallmentStatus.PAID, partial.installments().get(0).status());
        assertEquals(InstallmentStatus.PARTIALLY_PAID, partial.installments().get(1).status());
        assertEquals(PaymentPlanStatus.ACTIVE, partial.status());

        // Annulation : l'argent retiré fait renaître les tranches dans l'ordre
        // inverse (la 2e se rouvre, la 1re redevient en attente).
        paymentService.cancel(payment.id(), new CancelPaymentRequest("Erreur de saisie"), null);
        PlanDto reopened = planService.get(plan.id());
        assertEquals(PaymentPlanStatus.ACTIVE, reopened.status());
        assertEquals(InstallmentStatus.PENDING, reopened.installments().get(0).status());
        assertEquals(InstallmentStatus.PENDING, reopened.installments().get(1).status());
        assertEquals(InstallmentStatus.PENDING, reopened.installments().get(2).status());
        assertTrue(reopened.installments().stream().allMatch(i -> i.paidAmount().signum() == 0));

        // Un second paiement intégral referme l'échéancier.
        paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("300000"),
                LocalDate.now(), PaymentMethod.BANK_TRANSFER, null, null, null, null), null);
        assertEquals(PaymentPlanStatus.COMPLETED, planService.get(plan.id()).status());
    }

    @Test
    @DisplayName("FIFO : l'argent solde d'abord l'échéancier le plus ancien avant le suivant")
    void moneySettlesOldestPlanFirstAcrossTwoPlans() {
        TaxDebt debt = manualDebt(new BigDecimal("200000"));
        LocalDate t = LocalDate.now();

        // Échéancier A (100 000) d'abord, réglé intégralement.
        PlanDto planA = planService.create(new CreatePlanRequest(debt.getId(), "Échéancier A", null,
                List.of(new InstallmentRequest(t.plusDays(10), new BigDecimal("100000")))), null);
        var paymentA = paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("100000"),
                LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        assertEquals(PaymentPlanStatus.COMPLETED, planService.get(planA.id()).status());

        // Échéancier B (100 000) accepté sur le solde restant.
        PlanDto planB = planService.create(new CreatePlanRequest(debt.getId(), "Échéancier B", null,
                List.of(new InstallmentRequest(t.plusDays(20), new BigDecimal("100000")))), null);

        // Nouveau paiement : l'échéancier A (le plus ancien) reste prioritaire
        // puis l'excédent règle B — le solde final est 0.
        var paymentB = paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("100000"),
                LocalDate.now(), PaymentMethod.BANK_TRANSFER, null, null, null, null), null);
        assertEquals(PaymentPlanStatus.COMPLETED, planService.get(planA.id()).status());
        assertEquals(PaymentPlanStatus.COMPLETED, planService.get(planB.id()).status());

        // Annulation du paiement de B : A (le plus ancien, déjà réglé)
        // conserve son argent, B redevient actif.
        paymentService.cancel(paymentB.id(), new CancelPaymentRequest("Reversement"), null);
        assertEquals(PaymentPlanStatus.COMPLETED, planService.get(planA.id()).status());
        PlanDto bAfter = planService.get(planB.id());
        assertEquals(PaymentPlanStatus.ACTIVE, bAfter.status());
        assertEquals(InstallmentStatus.PENDING, bAfter.installments().get(0).status());

        // L'annulation du paiement de A retire le dernier argent : les deux
        // échéanciers redeviennent actifs (plus aucun règlement enregistré).
        paymentService.cancel(paymentA.id(), new CancelPaymentRequest("Doublon"), null);
        assertEquals(PaymentPlanStatus.ACTIVE, planService.get(planA.id()).status());
        PlanDto bReopened = planService.get(planB.id());
        assertEquals(PaymentPlanStatus.ACTIVE, bReopened.status());
        assertEquals(InstallmentStatus.PENDING, bReopened.installments().get(0).status());
    }

    @Test
    @DisplayName("Annulation du paiement : l'échéancier déjà réglé redevient actif (source de vérité = allocations)")
    void cancellingPaymentReactivesPlan() throws Exception {
        TaxDebt debt = manualDebt(new BigDecimal("100000"));
        PlanDto plan = planService.create(new CreatePlanRequest(debt.getId(), "Solde en une fois", null,
                List.of(new InstallmentRequest(LocalDate.now().plusDays(15), new BigDecimal("100000")))), null);

        var payment = paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("100000"),
                LocalDate.now(), PaymentMethod.BANK_TRANSFER, null, null, null, null), null);
        PlanDto completed = planService.get(plan.id());
        assertEquals(PaymentPlanStatus.COMPLETED, completed.status());

        // Annulation du paiement (allocation supprimée) → échéancier réactivé
        paymentService.cancel(payment.id(), new CancelPaymentRequest("Erreur de saisie"), null);
        PlanDto reactivated = planService.get(plan.id());
        assertEquals(PaymentPlanStatus.ACTIVE, reactivated.status());
        assertEquals(InstallmentStatus.PENDING, reactivated.installments().get(0).status());
    }

    @Test
    @DisplayName("Tranche échue non réglée → OVERDUE par détection quotidienne avec trace et sans procédure automatique")
    void overdueInstallmentDetectedDaily() {
        TaxDebt debt = manualDebt(new BigDecimal("100000"));
        PlanDto plan = planService.create(new CreatePlanRequest(debt.getId(), "Tranche unique", null,
                List.of(new InstallmentRequest(LocalDate.now().plusDays(1), new BigDecimal("100000")))), null);

        // La tranche passe le délai sans paiement : on simule le temps qui passe.
        PaymentPlan entity = planRepository.findById(plan.id()).orElseThrow();
        PaymentPlanInstallment inst = entity.getInstallments().get(0);
        inst.setDueDate(LocalDate.now().minusDays(3));
        inst.setUpdatedAt(Instant.now());
        planRepository.save(entity);

        int affected = planService.markOverdueInstallments(LocalDate.now());
        assertEquals(1, affected);

        PlanDto after = planService.get(plan.id());
        assertEquals(InstallmentStatus.OVERDUE, after.installments().get(0).status());
        assertTrue(after.installments().get(0).daysOverdue() >= 3);
        assertEquals(PaymentPlanStatus.ACTIVE, after.status(), "Aucune procédure automatique : le plan reste actif");

        boolean trace = historyRepository.findByDebtIdOrderByEventDateDesc(debt.getId()).stream()
                .anyMatch(h -> "INSTALLMENT_OVERDUE".equals(h.getEventType()));
        assertTrue(trace, "Une trace INSTALLMENT_OVERDUE doit exister (alerte)");

        // La re-détection est idempotente (aucune nouvelle alerte pour la même tranche)
        assertEquals(0, planService.markOverdueInstallments(LocalDate.now()));
    }

    @Test
    @DisplayName("Annulation d'un échéancier : statut CANCELLED et tranches non payées annulées")
    void cancelPlanMarksInstallmentsCancelled() {
        TaxDebt debt = manualDebt(new BigDecimal("200000"));
        PlanDto plan = planService.create(new CreatePlanRequest(debt.getId(), "À annuler", null,
                List.of(new InstallmentRequest(LocalDate.now().plusDays(5), new BigDecimal("200000")))), null);

        planService.cancel(plan.id(), new CancelPlanRequest("Dossier passé en contentieux"), null);
        PlanDto cancelled = planService.get(plan.id());
        assertEquals(PaymentPlanStatus.CANCELLED, cancelled.status());
        assertEquals(InstallmentStatus.CANCELLED, cancelled.installments().get(0).status());
    }
}
