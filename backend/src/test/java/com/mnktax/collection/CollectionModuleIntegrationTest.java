package com.mnktax.collection;

import com.mnktax.audit.repository.AuditLogRepository;
import com.mnktax.collection.dto.CollectionDtos.CollectionDebtRowDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDetailDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionEventDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionStatsDto;
import com.mnktax.collection.dto.CollectionDtos.CreateActionRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateNoticeRequest;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.service.CollectionDocumentService;
import com.mnktax.collection.service.CollectionService;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtOrigin;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNull;
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
    @Autowired private CollectionDocumentService documentService;
    @Autowired private AuditLogRepository auditLogRepository;
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
    @DisplayName("Relance amiable : aucun changement de phase, journal dédié, refusée sans solde à recouvrer")
    void reminderFollowsFiscalLadder() {
        TaxDebt debt = manualDebt(new BigDecimal("300000"), LocalDate.now().minusDays(20), DebtStatus.OVERDUE);

        // Une relance amiable n'entraîne jamais le passage en recouvrement : le
        // dossier reste en retard tant qu'aucun acte formel n'a été émis.
        collectionService.createAction(new CreateActionRequest(debt.getId(),
                CollectionActionType.REMINDER, "Relance amiable — régularisation demandée",
                LocalDate.now(), "En attente de paiement", "Relance amiable n°2",
                LocalDate.now().plusDays(10)), null);
        TaxDebt afterReminder = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.OVERDUE, afterReminder.getStatus(),
                "Une relance amiable ne modifie pas la phase fiscale du dossier");

        // Le journal distingue la relance d'une action ordinaire.
        collectionService.createAction(new CreateActionRequest(debt.getId(),
                CollectionActionType.NOTE, "Note interne sur le dossier",
                LocalDate.now(), null, null, null), null);
        List<String> types = collectionService.searchEvents(debt.getId(), null, null,
                PageRequest.of(0, 50)).getContent().stream().map(CollectionEventDto::eventType).toList();
        assertTrue(types.contains("REMINDER_CREATED"), "La relance est journalisée comme telle");
        assertTrue(types.contains("ACTION_CREATED"), "Une note ne doit pas être journalisée comme une relance");

        // Aucun solde à recouvrer : la relance est refusée.
        TaxDebt settled = manualDebt(new BigDecimal("50000"), LocalDate.now().minusDays(5), DebtStatus.ISSUED);
        settled.setBalance(BigDecimal.ZERO);
        debtRepository.save(settled);
        com.mnktax.common.exception.BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> collectionService.createAction(new CreateActionRequest(settled.getId(),
                        CollectionActionType.REMINDER, "Relance sans solde",
                        LocalDate.now(), null, null, null), null));
        assertEquals("DEBT_NOTHING_TO_REMIND", ex.getCode());
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

        debtService.suspend(debt.getId(), "Moratoire accordé", null);
        TaxDebt suspended = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.SUSPENDED, suspended.getStatus());
        assertNotNull(suspended.getSuspendedAt());

        // Aucune mise en demeure possible sur un dossier suspendu.
        org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> collectionService.createNotice(new CreateNoticeRequest(debt.getId(),
                        "MISE_EN_DEMEURE", "test"), null));

        debtService.resume(debt.getId(), null);
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

    @Test
    @DisplayName("Une action FOLLOW_UP alimente l'onglet Relances et les KPI de relances")
    void followUpActionFeedsRemindersTabAndKpi() {
        TaxDebt debt = manualDebt(new BigDecimal("150000"), LocalDate.now().minusDays(8), DebtStatus.OVERDUE);

        long remindersBefore = collectionService.stats().reminderActions();
        long overdueBefore = collectionService.stats().remindersOverdue();

        // Suivi créé via le wizard : doit compter comme une relance amiable
        // (même famille que REMINDER dans l'onglet « Relances »).
        collectionService.createAction(new CreateActionRequest(debt.getId(),
                CollectionActionType.FOLLOW_UP, "Suivi de la relance amiable",
                LocalDate.now().minusDays(3), "En attente de paiement", "Relance dans 7 jours",
                LocalDate.now().minusDays(1)), null);

        Page<CollectionDebtRowDto> reminders = collectionService.getCollectionDebts(
                null, null, null, null, null, false, false, true,
                null, null, null, null, null, PageRequest.of(0, 100));
        CollectionDebtRowDto row = reminders.getContent().stream()
                .filter(r -> r.id().equals(debt.getId()))
                .findFirst()
                .orElse(null);
        assertNotNull(row, "Le dossier suivi (FOLLOW_UP) doit apparaître dans l'onglet Relances");
        assertEquals(LocalDate.now().minusDays(3), row.lastReminderDate(),
                "Le suivi doit alimenter le dernier rappel de relance");
        assertTrue(row.nextReminderOverdue(), "La prochaine relance prévue est déjà dépassée");

        CollectionStatsDto stats = collectionService.stats();
        assertTrue(stats.reminderActions() > remindersBefore,
                "Le KPI reminderActions doit inclure les FOLLOW_UP");
        assertTrue(stats.remindersOverdue() > overdueBefore,
                "L'alerte « relances en retard » doit inclure les FOLLOW_UP");
    }

    @Test
    @DisplayName("Document mise en demeure : refusé sans acte émis, généré et tracé avec (journal)")
    void formalActDocumentRequiresNoticeAndIsTraced() {
        TaxDebt debt = manualDebt(new BigDecimal("220000"), LocalDate.now().minusDays(15), DebtStatus.OVERDUE);

        // Pas d'acte → pas de PDF : aucune mention juridique n'est inventée.
        com.mnktax.common.exception.BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> documentService.miseEnDemeure(debt.getId(), null));
        assertEquals("NOTICE_REQUIRED", ex.getCode());

        // La relance amiable n'exige aucun acte formel.
        byte[] relance = documentService.relance(debt.getId(), null);
        assertTrue(relance.length > 4, "La lettre de relance doit être générée");
        assertEquals("%PDF", new String(relance, 0, 4, java.nio.charset.StandardCharsets.US_ASCII));

        collectionService.createNotice(new CreateNoticeRequest(debt.getId(),
                "MISE_EN_DEMEURE", "Invitation à régulariser"), null);

        byte[] md = documentService.miseEnDemeure(debt.getId(), null);
        assertTrue(md.length > 4, "La mise en demeure doit être générée après émission de l'acte");
        assertEquals("%PDF", new String(md, 0, 4, java.nio.charset.StandardCharsets.US_ASCII));

        List<DebtHistory> history = historyRepository.findByDebtIdOrderByEventDateDesc(debt.getId());
        assertTrue(history.stream().anyMatch(h -> "DOCUMENT_GENERATED".equals(h.getEventType())
                        && h.getDescription().contains("Document mise en demeure généré")),
                "La génération de la mise en demeure doit être tracée au journal");
        assertTrue(history.stream().anyMatch(h -> "DOCUMENT_GENERATED".equals(h.getEventType())
                        && h.getDescription().contains("Document relance généré")),
                "La génération de la relance doit être tracée au journal");
    }

    @Test
    @DisplayName("État des restes : toutes les pages parcourues — somme et total au-delà de 500 lignes")
    void etatDesRestesCoversAllPages() throws Exception {
        String period = LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue());
        // Insertion directe : ReferenceGenerator (horodatage à la seconde + 4 chiffres)
        // entrerait en collision sur l'unique référence à cette cadence.
        for (int i = 0; i < 505; i++) {
            debtRepository.save(TaxDebt.builder()
                    .reference(String.format("DEB-ETAT-%04d", i))
                    .taxpayer(company)
                    .taxType(tva)
                    .taxpayerCenter(company.getTaxCenter() != null ? company.getTaxCenter().getCode() : null)
                    .period(period)
                    .principalAmount(new BigDecimal("1000"))
                    .penaltyAmount(BigDecimal.ZERO)
                    .interestAmount(BigDecimal.ZERO)
                    .adjustmentsAmount(BigDecimal.ZERO)
                    .creditsAmount(BigDecimal.ZERO)
                    .totalAmount(new BigDecimal("1000"))
                    .paidAmount(BigDecimal.ZERO)
                    .balance(new BigDecimal("1000"))
                    .issueDate(LocalDate.now())
                    .dueDate(LocalDate.now().plusDays(30))
                    .lastDueDate(LocalDate.now().plusDays(30))
                    .status(DebtStatus.ISSUED)
                    .origin(DebtOrigin.OTHER)
                    .collectionPriority(DebtCollectionPriority.NORMAL)
                    .observations("Créance état des restes")
                    .createdBy("test")
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build());
        }
        long expectedCount = debtRepository.count();
        assertTrue(expectedCount > 500, "Le jeu de données doit dépasser une page de 500 lignes");
        BigDecimal expectedSum = debtRepository.findAll().stream()
                .map(d -> d.getBalance() == null ? BigDecimal.ZERO : d.getBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        String expectedAmount = expectedSum.setScale(0, java.math.RoundingMode.HALF_UP).toString()
                .replaceAll("\\B(?=(\\d{3})+(?!\\d))", " ");

        byte[] pdf = documentService.etatDesRestes(false, null, null, null);
        String text = extractPdfText(pdf);

        assertTrue(text.contains("TOTAL GÉNÉRAL : " + expectedAmount + " MGA"),
                "La somme doit couvrir toutes les pages (attendu : " + expectedAmount + ")");
        assertTrue(text.contains(expectedCount + " créance(s)"),
                "Le total doit correspondre au nombre réel de créances (" + expectedCount + ")");
    }

    @Test
    @DisplayName("Réactivation : restaure le statut antérieur (recouvrement / contentieux) au lieu d'un recalcul brutal")
    void resumeRestoresPreviousStatus() {
        // 1. Créance sous mise en demeure (IN_COLLECTION) suspendue puis réactivée.
        TaxDebt inCollection = manualDebt(new BigDecimal("400000"), LocalDate.now().minusDays(10), DebtStatus.OVERDUE);
        collectionService.createNotice(new CreateNoticeRequest(inCollection.getId(),
                "MISE_EN_DEMEURE", "Acte de recouvrement"), null);
        debtService.suspend(inCollection.getId(), "Sursis de paiement", null);
        TaxDebt suspended = debtRepository.findByIdForUpdate(inCollection.getId()).orElseThrow();
        assertEquals(DebtStatus.SUSPENDED, suspended.getStatus());
        assertEquals(DebtStatus.IN_COLLECTION, suspended.getPreviousStatus(),
                "Le statut antérieur est mémorisé à la suspension");

        debtService.resume(inCollection.getId(), null);
        TaxDebt restored = debtRepository.findByIdForUpdate(inCollection.getId()).orElseThrow();
        assertEquals(DebtStatus.IN_COLLECTION, restored.getStatus(),
                "La réactivation doit restaurer la phase recouvrement");
        assertNull(restored.getPreviousStatus(), "Le statut antérieur est effacé après restauration");

        // 2. Créance en litige (DISPUTED) suspendue puis réactivée.
        TaxDebt disputed = manualDebt(new BigDecimal("310000"), LocalDate.now().minusDays(6), DebtStatus.OVERDUE);
        collectionService.createDispute(new com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest(
                disputed.getId(), "Contestation", null, null), null);
        debtService.suspend(disputed.getId(), "Sursis contentieux", null);
        debtService.resume(disputed.getId(), null);
        TaxDebt backToDispute = debtRepository.findByIdForUpdate(disputed.getId()).orElseThrow();
        assertEquals(DebtStatus.DISPUTED, backToDispute.getStatus(),
                "La réactivation doit restaurer le contentieux");

        // 3. Données antérieures à la migration (previous_status NULL) : recalcul classique.
        TaxDebt legacy = manualDebt(new BigDecimal("120000"), LocalDate.now().minusDays(3), DebtStatus.ISSUED);
        legacy.setStatus(DebtStatus.SUSPENDED);
        legacy.setSuspendedAt(Instant.now());
        legacy.setPreviousStatus(null);
        debtRepository.save(legacy);
        debtService.resume(legacy.getId(), null);
        TaxDebt legacyResumed = debtRepository.findByIdForUpdate(legacy.getId()).orElseThrow();
        assertEquals(DebtStatus.OVERDUE, legacyResumed.getStatus(),
                "Sans statut mémorisé : recalcul fidèle (échue → en retard)");
    }

    @Test
    @DisplayName("Litige ouvert : bloque relances, actes formels et passage en recouvrement (conflit 409)")
    void openDisputeBlocksFormalActions() {
        TaxDebt debt = manualDebt(new BigDecimal("450000"), LocalDate.now().minusDays(9), DebtStatus.OVERDUE);
        collectionService.createDispute(new com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest(
                debt.getId(), "Contestation du montant", null, null), null);

        com.mnktax.common.exception.BusinessException exAction = org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> collectionService.createAction(new CreateActionRequest(debt.getId(),
                        CollectionActionType.REMINDER, "Relance pendant litige",
                        LocalDate.now(), null, null, null), null));
        assertEquals("DISPUTE_OPEN", exAction.getCode());

        com.mnktax.common.exception.BusinessException exNotice = org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> collectionService.createNotice(new CreateNoticeRequest(debt.getId(),
                        "MISE_EN_DEMEURE", "Acte pendant litige"), null));
        assertEquals("DISPUTE_OPEN", exNotice.getCode());

        com.mnktax.common.exception.BusinessException exInCollection = org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> debtService.setInCollection(debt.getId(), null));
        assertEquals("DISPUTE_OPEN", exInCollection.getCode());

        // La créance reste en contentieux (pas de bascule contradictoire en recouvrement).
        assertEquals(DebtStatus.DISPUTED,
                debtRepository.findByIdForUpdate(debt.getId()).orElseThrow().getStatus());

        // Le doublon de litige garde son message dédié.
        com.mnktax.common.exception.BusinessException exDup = org.junit.jupiter.api.Assertions.assertThrows(
                com.mnktax.common.exception.BusinessException.class,
                () -> collectionService.createDispute(new com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest(
                        debt.getId(), "Doublon", null, null), null));
        assertEquals("DISPUTE_ALREADY_OPEN", exDup.getCode());
    }

    @Test
    @DisplayName("Les 7 mutations de créance produisent une entrée d'audit (actor + old/new)")
    void debtTransitionsWriteAuditEntries() {
        TaxDebt debt = manualDebt(new BigDecimal("260000"), LocalDate.now().minusDays(11), DebtStatus.OVERDUE);
        String id = String.valueOf(debt.getId());

        debtService.suspend(debt.getId(), "Motif test", null);
        assertTrue(awaitAudit("SUSPENDED", id), "Entrée d'audit SUSPENDED attendue");
        debtService.resume(debt.getId(), null);
        assertTrue(awaitAudit("RESUMED", id), "Entrée d'audit RESUMED attendue");
        debtService.updatePriority(debt.getId(), DebtCollectionPriority.LOW, null);
        assertTrue(awaitAudit("PRIORITY_CHANGED", id), "Entrée d'audit PRIORITY_CHANGED attendue");
        debtService.addAdjustment(debt.getId(), "Réduction négociée", new BigDecimal("1000"), null);
        assertTrue(awaitAudit("ADJUSTMENT", id), "Entrée d'audit ADJUSTMENT attendue");
        debtService.setInCollection(debt.getId(), null);
        assertTrue(awaitAudit("IN_COLLECTION", id), "Entrée d'audit IN_COLLECTION attendue");
        debtService.close(debt.getId(), "Irrécouvrable", null);
        assertTrue(awaitAudit("CLOSED", id), "Entrée d'audit CLOSED attendue");

        TaxDebt other = manualDebt(new BigDecimal("90000"), LocalDate.now().minusDays(4), DebtStatus.OVERDUE);
        debtService.cancel(other.getId(), null);
        assertTrue(awaitAudit("CANCELLED", String.valueOf(other.getId())),
                "Entrée d'audit CANCELLED attendue");
    }

    @Test
    @DisplayName("Détail, historique et journaux : relations chargées sans rupture de lazy-loading")
    void detailAndSearchesLoadRelationsEagerly() {
        TaxDebt debt = manualDebt(new BigDecimal("350000"), LocalDate.now().minusDays(7), DebtStatus.OVERDUE);
        collectionService.createAction(new CreateActionRequest(debt.getId(),
                CollectionActionType.FOLLOW_UP, "Suivi téléphonique", LocalDate.now(),
                null, null, null), null);
        collectionService.createNotice(new CreateNoticeRequest(debt.getId(),
                "MISE_EN_DEMEURE", "Contenu de l'acte"), null);

        CollectionDetailDto detail = collectionService.detail(debt.getId());
        assertNotNull(detail.taxpayer());
        assertNotNull(detail.taxpayer().nif());
        assertNotNull(detail.taxpayer().taxCenterCode());
        assertFalse(detail.actions().isEmpty(), "Le détail doit lister les actions");
        assertEquals(1, detail.notices().size());

        com.mnktax.collection.dto.CollectionDtos.CollectionHistoryDto history =
                collectionService.history(debt.getId());
        assertFalse(history.actions().isEmpty());
        assertFalse(history.notices().isEmpty());

        assertTrue(collectionService.searchActions(debt.getId(), null, null, null, PageRequest.of(0, 20))
                .getTotalElements() >= 2);
        assertTrue(collectionService.searchNotices(debt.getId(), null, null, PageRequest.of(0, 20))
                .getTotalElements() >= 1);
        assertTrue(collectionService.searchEvents(debt.getId(), null, null, PageRequest.of(0, 20))
                .getTotalElements() >= 1);
    }

    // ── Helpers ──────────────────────────────────────────────

    /** Attend (asynchrone) qu'une entrée d'audit soit écrite pour l'action et l'entité. */
    private boolean awaitAudit(String action, String entityId) {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            boolean found = auditLogRepository.findAll().stream()
                    .anyMatch(a -> action.equals(a.getAction()) && entityId.equals(a.getEntityId()));
            if (found) {
                return true;
            }
            try {
                Thread.sleep(25);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return false;
    }

    /** Extrait le texte de toutes les pages d'un PDF (vérifications de contenu). */
    private static String extractPdfText(byte[] pdf) throws java.io.IOException {
        com.lowagie.text.pdf.PdfReader reader = new com.lowagie.text.pdf.PdfReader(pdf);
        try {
            com.lowagie.text.pdf.parser.PdfTextExtractor extractor =
                    new com.lowagie.text.pdf.parser.PdfTextExtractor(reader);
            StringBuilder all = new StringBuilder();
            for (int p = 1; p <= reader.getNumberOfPages(); p++) {
                all.append(extractor.getTextFromPage(p)).append('\n');
            }
            return all.toString();
        } finally {
            reader.close();
        }
    }
}
