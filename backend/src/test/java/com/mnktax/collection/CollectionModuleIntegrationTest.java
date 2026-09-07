package com.mnktax.collection;

import com.mnktax.collection.dto.CollectionDtos.CollectionDebtRowDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionEventDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionStatsDto;
import com.mnktax.collection.dto.CollectionDtos.CreateActionRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateNoticeRequest;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.service.CollectionService;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.entity.PaymentStatus;
import com.mnktax.payment.service.PaymentService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests du module Recouvrement (onglets, paiements partiels/complets,
 * relances, mises en demeure, KPI réels).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CollectionModuleIntegrationTest {

    @Autowired private TaxCenterRepository centerRepository;
    @Autowired private TaxRegimeRepository regimeRepository;
    @Autowired private TaxTypeRepository taxTypeRepository;
    @Autowired private TaxpayerRepository taxpayerRepository;
    @Autowired private TaxDebtRepository debtRepository;
    @Autowired private DebtHistoryRepository historyRepository;
    @Autowired private DebtService debtService;
    @Autowired private PaymentService paymentService;
    @Autowired private CollectionService collectionService;
    @Autowired private com.mnktax.debt.repository.DebtDisputeRepository disputeRepository;

    private Taxpayer company;
    private TaxType tva;

    @BeforeEach
    void setUp() {
        if (taxpayerRepository.count() > 0) {
            return;
        }
        TaxCenter center = centerRepository.save(TaxCenter.builder()
                .code("CEN-COLL-TEST").name("Centre recouvrement test").address("Test (fictif)")
                .createdAt(Instant.now()).build());
        TaxRegime regime = regimeRepository.save(TaxRegime.builder()
                .code("REG-COLL-TEST").name("Régime recouvrement test").category("REEL")
                .vatApplicable(true).build());
        tva = taxTypeRepository.findByCode("TVA").orElseGet(() ->
                taxTypeRepository.save(TaxType.builder()
                        .code("TVA").name("TVA - DÉMO").category("DEMO").active(true).build()));

        Taxpayer tp = Taxpayer.builder()
                .nif("0000442201").type(TaxpayerType.COMPANY).name("Société Recouvrement Test")
                .email("collection@demo.mg").phone("0321111111").address("Adresse fictive")
                .taxCenter(center).taxRegime(regime)
                .status(TaxpayerStatus.ACTIVE)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
        company = taxpayerRepository.save(tp);
    }

    private TaxDebt manualDebt(BigDecimal principal, LocalDate dueDate, DebtStatus status) {
        TaxDebt debt = debtService.createManual(company.getId(), "TVA",
                LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue()),
                principal, "Créance de test recouvrement", DebtCollectionPriority.HIGH);
        debt.setDueDate(dueDate);
        debt.setLastDueDate(dueDate);
        debt.setStatus(status);
        debt.setUpdatedAt(Instant.now());
        return debtRepository.save(debt);
    }

    @Test
    @DisplayName("Paiement partiel puis complet : solde et statut recalculés par le backend")
    void partialThenFullPaymentRecomputesDebt() {
        TaxDebt debt = manualDebt(new BigDecimal("200000"), LocalDate.now().plusMonths(1), DebtStatus.ISSUED);

        PaymentDto p1 = paymentService.record(new CreatePaymentRequest(debt.getId(),
                new BigDecimal("100000"), LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        assertEquals(PaymentStatus.ALLOCATED, p1.status());

        TaxDebt afterP1 = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.PARTIALLY_PAID, afterP1.getStatus());
        assertEquals(0, afterP1.getBalance().compareTo(new BigDecimal("100000.00")));
        assertEquals(0, afterP1.getPaidAmount().compareTo(new BigDecimal("100000.00")));

        paymentService.record(new CreatePaymentRequest(debt.getId(),
                new BigDecimal("100000"), LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);

        TaxDebt afterP2 = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.PAID, afterP2.getStatus());
        assertEquals(0, afterP2.getBalance().compareTo(BigDecimal.ZERO));
        assertNotNull(afterP2.getClosedAt());
        assertTrue(historyRepository.countByDebtId(debt.getId()) > 0,
                "Une trace d'audit doit exister sur la créance");
    }

    @Test
    @DisplayName("Une créance échue non payée apparaît dans l'onglet OVERDUE quelle que soit la date de détection")
    void overdueTabUsesRealDueDates() {
        // Échéance dépassée de 40 jours mais statut encore ISSUED (le job quotidien
        // n'a pas encore tourné) : l'onglet « En retard » doit quand même la montrer.
        manualDebt(new BigDecimal("327000"), LocalDate.now().minusDays(40), DebtStatus.ISSUED);

        Page<CollectionDebtRowDto> rows = collectionService.getCollectionDebts(
                null, null, null, null, null, true, false, false,
                null, null, null, null, null, PageRequest.of(0, 20));

        assertTrue(rows.getTotalElements() >= 1, "La créance échue doit apparaître en retard");
        CollectionDebtRowDto row = rows.getContent().get(0);
        assertEquals("EN_RETARD", row.collectionStatus());
        assertTrue(row.daysOverdue() >= 40);
        assertEquals("HIGH", row.collectionPriority());
        assertEquals(0, row.balance().compareTo(new BigDecimal("327000.00")));
    }

    @Test
    @DisplayName("Relance puis mise en demeure : dossiers visibles dans les onglets et journal alimenté")
    void reminderAndFormalNoticeWorkflow() {
        TaxDebt debt = manualDebt(new BigDecimal("500000"), LocalDate.now().minusDays(45), DebtStatus.OVERDUE);

        collectionService.createAction(new CreateActionRequest(debt.getId(),
                CollectionActionType.REMINDER, "Relance amiable de régularisation",
                LocalDate.now().minusDays(10), "En attente de paiement", "Relance dans 15 jours",
                LocalDate.now().plusDays(5)), null);

        Page<CollectionDebtRowDto> reminders = collectionService.getCollectionDebts(
                null, null, null, null, null, false, false, true,
                null, null, null, null, null, PageRequest.of(0, 20));
        assertTrue(reminders.getTotalElements() >= 1, "Le dossier relancé doit apparaître dans l'onglet relances");

        // Mise en demeure : acte formel → la créance passe en phase recouvrement
        // (jamais automatiquement par un seuil de jours, uniquement par l'action de l'agent).
        collectionService.createNotice(new CreateNoticeRequest(debt.getId(),
                "MISE_EN_DEMEURE", "Invitation à régulariser la créance"), null);

        TaxDebt afterNotice = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.IN_COLLECTION, afterNotice.getStatus());

        Page<CollectionDebtRowDto> inCollection = collectionService.getCollectionDebts(
                null, null, null, null, null, false, true, false,
                null, null, null, null, null, PageRequest.of(0, 20));
        assertTrue(inCollection.getTotalElements() >= 1,
                "Le dossier sous mise en demeure doit apparaître dans l'onglet Mises en demeure");

        Page<CollectionEventDto> events = collectionService.searchEvents(debt.getId(), null, null,
                PageRequest.of(0, 50));
        List<String> types = events.getContent().stream().map(CollectionEventDto::eventType).toList();
        assertTrue(types.contains("REMINDER_CREATED"), "Le journal doit contenir la relance créée");
        assertTrue(types.contains("FORMAL_NOTICE_CREATED"), "Le journal doit contenir la mise en demeure");
        assertTrue(events.getContent().stream().allMatch(e -> e.performedBy() != null),
                "Chaque trace du journal est liée à un auteur");
    }

    @Test
    @DisplayName("Litige : déclaration → contentieux, décision rejetée → créance recouvrable (traces append-only)")
    void disputeLifecycleRejected() {
        TaxDebt debt = manualDebt(new BigDecimal("400000"), LocalDate.now().minusDays(20), DebtStatus.OVERDUE);

        var dto = collectionService.createDispute(new com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest(
                debt.getId(), "Contestation du redressement", new BigDecimal("150000"), null), null);
        assertNotNull(dto.reference());
        assertTrue(dto.reference().startsWith("LIT-"));
        assertEquals(com.mnktax.debt.entity.DisputeStatus.OPEN, dto.status());

        TaxDebt disputed = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.DISPUTED, disputed.getStatus(), "La créance doit passer en contentieux");

        boolean traceCreated = historyRepository.findByDebtIdOrderByEventDateDesc(debt.getId()).stream()
                .anyMatch(h -> "DISPUTE_CREATED".equals(h.getEventType()));
        assertTrue(traceCreated, "Le journal doit tracer la déclaration de litige");

        // Deuxième litige ouvert refusé tant que le premier est en cours.
        org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> collectionService.createDispute(new com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest(
                        debt.getId(), "Doublon", null, null), null));

        // Décision REJECTED : la créance redevient recouvrable (en retard).
        collectionService.resolveDispute(dto.id(),
                new com.mnktax.collection.dto.CollectionDtos.ResolveDisputeRequest(
                        com.mnktax.debt.entity.DisputeDecision.REJECTED, "Contestation écartée"), null);

        TaxDebt reopened = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.OVERDUE, reopened.getStatus());

        boolean traceResolved = historyRepository.findByDebtIdOrderByEventDateDesc(debt.getId()).stream()
                .anyMatch(h -> "DISPUTE_RESOLVED".equals(h.getEventType()));
        assertTrue(traceResolved, "Le journal doit tracer la décision");
    }

    @Test
    @DisplayName("Litige admis : aucune régularisation automatique — le dossier reste en contentieux jusqu'à une action explicite")
    void sustainedDisputeRequiresExplicitRegularisation() {
        TaxDebt debt = manualDebt(new BigDecimal("250000"), LocalDate.now().minusDays(5), DebtStatus.OVERDUE);

        var dto = collectionService.createDispute(new com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest(
                debt.getId(), "Erreur de liquidation", null, null), null);
        collectionService.resolveDispute(dto.id(),
                new com.mnktax.collection.dto.CollectionDtos.ResolveDisputeRequest(
                        com.mnktax.debt.entity.DisputeDecision.SUSTAINED, "À régulariser"), null);

        TaxDebt still = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.DISPUTED, still.getStatus(),
                "Aucune annulation/réduction automatique : le dossier attend une régularisation explicite");

        var resolved = collectionService.disputeOf(dto.id());
        assertEquals(com.mnktax.debt.entity.DisputeStatus.RESOLVED, resolved.status());
        assertEquals(com.mnktax.debt.entity.DisputeDecision.SUSTAINED, resolved.decision());
    }

    @Test
    @DisplayName("Suspension puis réactivation : statuts et traces cohérents")
    void suspendThenResume() {
        TaxDebt debt = manualDebt(new BigDecimal("180000"), LocalDate.now().minusDays(12), DebtStatus.OVERDUE);

        debtService.suspend(debt.getId(), "Moratoire accordé");
        TaxDebt suspended = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.SUSPENDED, suspended.getStatus());
        assertNotNull(suspended.getSuspendedAt());

        // Aucune mise en demeure possible sur un dossier suspendu.
        org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> collectionService.createNotice(new CreateNoticeRequest(debt.getId(),
                        "MISE_EN_DEMEURE", "test"), null));

        debtService.resume(debt.getId());
        TaxDebt resumed = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.OVERDUE, resumed.getStatus(), "Échue : la créance redevient en retard après réactivation");
        assertTrue(historyRepository.findByDebtIdOrderByEventDateDesc(debt.getId()).stream()
                .anyMatch(h -> "RESUMED".equals(h.getEventType())), "Le journal doit tracer la réactivation");
    }

    @Test
    @DisplayName("Les KPI proviennent des données réelles (aucune valeur statique)")
    void statsComeFromRealData() {
        manualDebt(new BigDecimal("100000"), LocalDate.now().minusDays(10), DebtStatus.OVERDUE);
        manualDebt(new BigDecimal("250000"), LocalDate.now().minusDays(75), DebtStatus.OVERDUE);

        TaxDebt partial = manualDebt(new BigDecimal("300000"), LocalDate.now().plusMonths(1), DebtStatus.ISSUED);
        paymentService.record(new CreatePaymentRequest(partial.getId(),
                new BigDecimal("120000"), LocalDate.now(), PaymentMethod.BANK_TRANSFER,
                null, null, null, null), null);

        CollectionStatsDto stats = collectionService.stats();
        assertTrue(stats.totalDebts() >= 3);
        assertTrue(stats.overdueDebts() >= 2, "Deux créances échues attendues dans les KPI");
        assertTrue(stats.overdue30() >= 1, "Au moins une créance en retard de plus de 30 jours");
        assertTrue(stats.overdue60() >= 1, "Au moins une créance en retard de plus de 60 jours (75 jours)");
        assertEquals(0, stats.overdue90(), "Aucune créance en retard de plus de 90 jours dans ce jeu de données");
        assertTrue(stats.partialDebts() >= 1);
        assertTrue(stats.totalOutstanding().signum() > 0);
        assertTrue(stats.totalCollected().signum() > 0, "Total encaissé = somme réelle des paiements");
        assertTrue(stats.collectionRate() >= 0 && stats.collectionRate() <= 100);
    }
}
