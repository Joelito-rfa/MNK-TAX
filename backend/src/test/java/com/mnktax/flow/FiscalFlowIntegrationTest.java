package com.mnktax.flow;

import com.mnktax.assessment.entity.Assessment;
import com.mnktax.assessment.repository.AssessmentRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.Interest;
import com.mnktax.debt.entity.Penalty;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.InterestRepository;
import com.mnktax.debt.repository.PenaltyRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.declaration.dto.DeclarationDtos.CreateDeclarationRequest;
import com.mnktax.declaration.dto.DeclarationDtos.DeclarationDto;
import com.mnktax.declaration.dto.DeclarationDtos.ValidateRequest;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.declaration.service.DeclarationService;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.entity.PaymentStatus;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.payment.service.PaymentService;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.repository.ReceiptRepository;
import com.mnktax.receipt.service.ReceiptService;
import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxRuleVersion;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.DeadlineRepository;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxRuleRepository;
import com.mnktax.tax.repository.TaxRuleVersionRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerActivity;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Parcours fiscal complet de bout en bout :
 * contribuable → déclaration → soumission → validation → imposition → créance →
 * paiement partiel → allocation → quittance → paiement total → dette payée.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FiscalFlowIntegrationTest {

    @Autowired private TaxCenterRepository centerRepository;
    @Autowired private TaxRegimeRepository regimeRepository;
    @Autowired private TaxTypeRepository taxTypeRepository;
    @Autowired private TaxRuleRepository ruleRepository;
    @Autowired private TaxRuleVersionRepository versionRepository;
    @Autowired private DeadlineRepository deadlineRepository;
    @Autowired private TaxpayerRepository taxpayerRepository;
    @Autowired private PenaltyRepository penaltyRepository;
    @Autowired private InterestRepository interestRepository;
    @Autowired private DeclarationService declarationService;
    @Autowired private AssessmentRepository assessmentRepository;
    @Autowired private TaxDebtRepository debtRepository;
    @Autowired private DebtService debtService;
    @Autowired private PaymentService paymentService;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private PaymentAllocationRepository allocationRepository;
    @Autowired private ReceiptRepository receiptRepository;
    @Autowired private ReceiptService receiptService;
    @Autowired private DeclarationRepository declarationRepository;

    private Taxpayer company;

    @BeforeEach
    void setUp() {
        if (taxpayerRepository.count() > 0) {
            return;
        }
        TaxCenter center = centerRepository.save(TaxCenter.builder()
                .code("CEN-TEST").name("Centre test - DÉMO").address("Test (fictif)")
                .createdAt(Instant.now()).build());
        TaxRegime regime = regimeRepository.save(TaxRegime.builder()
                .code("REG-TEST").name("Régime test - DÉMO").category("REEL")
                .vatApplicable(true).build());
        TaxType tva = taxTypeRepository.save(TaxType.builder()
                .code("TVA").name("TVA - DÉMO").category("DEMO").active(true).build());
        TaxRule rule = ruleRepository.save(TaxRule.builder()
                .code("R-TVA-TEST").name("TVA test 20%")
                .taxType(tva)
                .taxpayerType("COMPANY")
                .regime(regime)
                .calculationMethod(CalculationMethod.PERCENTAGE_OF_BASE)
                .rate(new BigDecimal("20"))
                .legalReference("DÉMO")
                .demo(true)
                .effectiveFrom(LocalDate.of(2024, 1, 1))
                .active(true)
                .createdAt(Instant.now())
                .createdBy("test")
                .build());
        versionRepository.save(TaxRuleVersion.builder().rule(rule).versionNumber(1)
                .snapshot("{}").reason("création test").createdAt(Instant.now()).build());
        deadlineRepository.save(Deadline.builder().taxType(tva).period("2025-11")
                .declarationDeadline(LocalDate.of(2025, 11, 20))
                .paymentDeadline(LocalDate.of(2025, 11, 25))
                .createdAt(Instant.now()).build());

        penaltyRepository.save(Penalty.builder().code("PEN_DEMO_5").name("Pénalité test 5%")
                .rate(new BigDecimal("5")).build());
        interestRepository.save(Interest.builder().code("INT_DEMO_1").name("Intérêt test 1%/mois")
                .rate(new BigDecimal("1")).periodicity("MONTHLY").build());

        Taxpayer tp = Taxpayer.builder()
                .nif("0000409001").type(TaxpayerType.COMPANY).name("Société Test DÉMO")
                .email("test@demo.mg").phone("0320000000").address("Adresse fictive")
                .taxCenter(center).taxRegime(regime)
                .status(TaxpayerStatus.ACTIVE)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
        tp.getActivities().add(TaxpayerActivity.builder().taxpayer(tp).code("4771")
                .label("Commerce - DÉMO").primary(true).build());
        company = taxpayerRepository.save(tp);
    }

    @Test
    @DisplayName("Parcours complet : déclaration validée → créance → paiements → quittance → dette payée")
    void fullFiscalFlow() {
        String period = LocalDate.now().getYear() + "-" + LocalDate.now().format(DateTimeFormatter.ofPattern("MM"));
        DeclarationDto declaration = declarationService.create(
                new CreateDeclarationRequest(company.getId(), "TVA", period,
                        null, null,
                        new BigDecimal("1000000"), new BigDecimal("200000"), null,
                        null, null, null, List.of()), null);
        declarationService.submit(declaration.id(), null);
        DeclarationDto validated = declarationService.validate(declaration.id(),
                new ValidateRequest("Test automatique"), null);

        assertEquals(DeclarationStatus.LIQUIDEE, validated.status());
        assertEquals(0, validated.calculatedTax().compareTo(new BigDecimal("200000.00")));

        Assessment assessment = assessmentRepository.findByDeclarationId(validated.id()).orElseThrow();
        assertEquals(0, assessment.getNetTax().compareTo(new BigDecimal("200000.00")));
        assertEquals("R-TVA-TEST", assessment.getRuleCode());

        TaxDebt debt = debtRepository.findByTaxpayerIdOrderByIdDesc(company.getId()).get(0);
        assertEquals(DebtStatus.ISSUED, debt.getStatus());
        assertEquals(0, debt.getBalance().compareTo(new BigDecimal("200000.00")));

        // Paiement partiel → allocation auto (principal) + quittance
        PaymentDto partial = paymentService.record(new CreatePaymentRequest(debt.getId(),
                new BigDecimal("50000"), LocalDate.now(), PaymentMethod.BANK_TRANSFER, null, null, null, null), null);
        assertEquals(PaymentStatus.ALLOCATED, partial.status());
        assertNotNull(partial.receiptReference());

        TaxDebt afterPartial = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.PARTIALLY_PAID, afterPartial.getStatus());
        assertEquals(0, afterPartial.getPaidAmount().compareTo(new BigDecimal("50000.00")));
        assertEquals(0, afterPartial.getBalance().compareTo(new BigDecimal("150000.00")));

        PaymentDto full = paymentService.record(new CreatePaymentRequest(debt.getId(),
                new BigDecimal("150000"), LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null);
        assertNotNull(full.receiptReference());

        TaxDebt paid = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.PAID, paid.getStatus());
        assertEquals(0, paid.getBalance().compareTo(BigDecimal.ZERO));
        assertNotNull(paid.getClosedAt());

        // Quittance générée avec QR
        Receipt receipt = receiptRepository.findByPaymentId(full.id()).orElseThrow();
        assertEquals(ReceiptStatus.ISSUED, receipt.getStatus());
        assertEquals(0, receipt.getAmount().compareTo(new BigDecimal("150000.00")));
        assertNotNull(receipt.getQrCodePath());

        // Vérification publique de la quittance (par token)
        var verification = receiptService.verify(receipt.getVerificationToken());
        assertEquals(receipt.getReference(), verification.reference());

        // Une dette payée ne peut plus recevoir de paiement
        assertThrows(BusinessException.class, () -> paymentService.record(
                new CreatePaymentRequest(debt.getId(), new BigDecimal("1000"),
                        LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null));
    }

    @Test
    @DisplayName("Un paiement supérieur au solde restant est refusé")
    void overpaymentRejected() {
        String period = LocalDate.now().getYear() + "-" + LocalDate.now().format(DateTimeFormatter.ofPattern("MM"));
        DeclarationDto d = declarationService.create(
                new CreateDeclarationRequest(company.getId(), "TVA", period,
                        null, null,
                        new BigDecimal("1000000"), new BigDecimal("200000"), null,
                        null, null, null, List.of()), null);
        declarationService.submit(d.id(), null);
        declarationService.validate(d.id(), new ValidateRequest("Test"), null);

        TaxDebt debt = debtRepository.findByTaxpayerIdOrderByIdDesc(company.getId()).get(0);
        BusinessException ex = assertThrows(BusinessException.class, () -> paymentService.record(
                new CreatePaymentRequest(debt.getId(), new BigDecimal("999999999"),
                        LocalDate.now(), PaymentMethod.CASH, null, null, null, null), null));
        assertEquals("PAYMENT_EXCEEDS_BALANCE", ex.getCode());
    }

    @Test
    @DisplayName("Créance en retard → statut OVERDUE avec pénalité et intérêts de retard")
    void overdueDebtAccruesPenaltyAndInterest() {
        DeclarationDto d = declarationService.create(
                new CreateDeclarationRequest(company.getId(), "TVA", "2025-11",
                        null, null,
                        new BigDecimal("500000"), new BigDecimal("100000"), null,
                        null, null, null, List.of()), null);
        declarationService.submit(d.id(), null);
        declarationService.validate(d.id(), new ValidateRequest("Test"), null);

        TaxDebt debt = debtRepository.findByTaxpayerIdOrderByIdDesc(company.getId()).get(0);
        assertEquals(LocalDate.of(2025, 11, 25), debt.getDueDate());

        var marked = debtService.markOverdue(LocalDate.now(), null, null, null, null, null, null, null);
        assertTrue(marked.updated() >= 1);

        TaxDebt overdue = debtRepository.findByIdForUpdate(debt.getId()).orElseThrow();
        assertEquals(DebtStatus.OVERDUE, overdue.getStatus());
        assertEquals(0, overdue.getPrincipalAmount().compareTo(new BigDecimal("100000.00")));
        assertEquals(0, overdue.getPenaltyAmount().compareTo(new BigDecimal("5000.00")));
        assertTrue(overdue.getInterestAmount().signum() > 0);
        assertEquals(0, overdue.getTotalAmount().compareTo(
                new BigDecimal("100000").add(overdue.getPenaltyAmount()).add(overdue.getInterestAmount())));
    }

    @Test
    @DisplayName("Référence de quittance vérifiable : référence unique et cohérente")
    void paymentCreatesUniqueReceipt() {
        String period = LocalDate.now().getYear() + "-" + LocalDate.now().format(DateTimeFormatter.ofPattern("MM"));
        DeclarationDto d = declarationService.create(
                new CreateDeclarationRequest(company.getId(), "TVA", period,
                        null, null,
                        new BigDecimal("1000000"), new BigDecimal("200000"), null,
                        null, null, null, List.of()), null);
        declarationService.submit(d.id(), null);
        declarationService.validate(d.id(), new ValidateRequest("Test"), null);
        TaxDebt debt = debtRepository.findByTaxpayerIdOrderByIdDesc(company.getId()).get(0);

        paymentService.record(new CreatePaymentRequest(debt.getId(), new BigDecimal("50000"),
                LocalDate.now(), PaymentMethod.MOBILE_MONEY, null, null, null, null), null);

        List<Receipt> receipts = receiptRepository.findByTaxpayerIdOrderByIdDesc(company.getId());
        assertEquals(1, receipts.size());
        assertEquals(0, receipts.get(0).getAmount().compareTo(new BigDecimal("50000.00")));
        assertNotNull(receipts.get(0).getReference());
    }
}
