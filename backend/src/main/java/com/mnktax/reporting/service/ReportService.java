package com.mnktax.reporting.service;

import com.mnktax.audit.repository.AuditLogRepository;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.repository.ReceiptRepository;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

/**
 * Service centralisé pour la génération de rapports fiscaux.
 */
@Service
public class ReportService {

    private final TaxpayerRepository taxpayerRepository;
    private final DeclarationRepository declarationRepository;
    private final TaxDebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogRepository auditLogRepository;
    private final ReceiptRepository receiptRepository;

    public ReportService(TaxpayerRepository taxpayerRepository,
                         DeclarationRepository declarationRepository,
                         TaxDebtRepository debtRepository,
                         PaymentRepository paymentRepository,
                         AuditLogRepository auditLogRepository,
                         ReceiptRepository receiptRepository) {
        this.taxpayerRepository = taxpayerRepository;
        this.declarationRepository = declarationRepository;
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
        this.auditLogRepository = auditLogRepository;
        this.receiptRepository = receiptRepository;
    }

    /**
     * Statistiques globales pour la page rapports.
     */
    @Transactional(readOnly = true)
    public ReportStats getStats() {
        long totalTaxpayers = taxpayerRepository.totalTaxpayers();
        long activeTaxpayers = taxpayerRepository.countByStatus(com.mnktax.taxpayer.entity.TaxpayerStatus.ACTIVE);
        long totalDeclarations = declarationRepository.count();
        long validatedDeclarations = declarationRepository.countByStatus(DeclarationStatus.VALIDATED);
        long paidDeclarations = declarationRepository.countByStatus(DeclarationStatus.PAYEE);
        long totalDebts = debtRepository.count();
        long overdueDebts = debtRepository.countByStatus(DebtStatus.OVERDUE);
        long paidDebts = debtRepository.countByStatus(DebtStatus.PAID);
        long totalPayments = paymentRepository.count();
        BigDecimal totalCollected = debtRepository.totalCollected();
        BigDecimal totalOutstanding = debtRepository.totalOutstanding();

        long totalReceipts = receiptRepository.count();
        BigDecimal receiptTotalAmount = receiptRepository.sumTotalAmount();
        long validReceipts = receiptRepository.countByStatus(ReceiptStatus.ISSUED);

        return new ReportStats(
                totalTaxpayers, activeTaxpayers,
                totalDeclarations, validatedDeclarations, paidDeclarations,
                totalDebts, overdueDebts, paidDebts,
                totalPayments, totalCollected, totalOutstanding,
                totalReceipts, receiptTotalAmount, validReceipts
        );
    }

    /**
     * Statistiques des déclarations pour le rapport.
     */
    @Transactional(readOnly = true)
    public DeclarationReportStats getDeclarationStats() {
        long total = declarationRepository.count();
        long draft = declarationRepository.countByStatus(DeclarationStatus.DRAFT);
        long submitted = declarationRepository.countByStatus(DeclarationStatus.SUBMITTED);
        long underReview = declarationRepository.countByStatus(DeclarationStatus.UNDER_REVIEW);
        long validated = declarationRepository.countByStatus(DeclarationStatus.VALIDATED);
        long rejected = declarationRepository.countByStatus(DeclarationStatus.REJECTED);
        long paid = declarationRepository.countByStatus(DeclarationStatus.PAYEE);
        long aCorriger = declarationRepository.countByStatus(DeclarationStatus.A_CORRIGER);
        BigDecimal declaredAmount = declarationRepository.sumDeclaredAmountAll();
        BigDecimal paidAmount = declarationRepository.sumPaidAmountAll();
        BigDecimal remaining = declarationRepository.sumRemainingAll();

        return new DeclarationReportStats(
                total, draft, submitted, underReview, validated, rejected, paid, aCorriger,
                declaredAmount, paidAmount, remaining
        );
    }

    /**
     * Statistiques des créances pour le rapport.
     */
    @Transactional(readOnly = true)
    public DebtReportStats getDebtStats() {
        long total = debtRepository.count();
        long overdue = debtRepository.countByStatus(DebtStatus.OVERDUE);
        long inCollection = debtRepository.countByStatus(DebtStatus.IN_COLLECTION);
        long paid = debtRepository.countByStatus(DebtStatus.PAID);
        BigDecimal totalAmount = debtRepository.totalCollected().add(debtRepository.totalOutstanding());
        BigDecimal collected = debtRepository.totalCollected();
        BigDecimal outstanding = debtRepository.totalOutstanding();
        double collectionRate = 0;
        if (totalAmount.signum() > 0) {
            collectionRate = collected.divide(totalAmount, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue();
        }

        return new DebtReportStats(
                total, overdue, inCollection, paid,
                totalAmount, collected, outstanding, collectionRate
        );
    }

    /**
     * Nombre total de rapports disponibles (pour les KPI).
     */
    public long getAvailableReportCount() {
        return 6; // recouvrement, paiements, déclarations, contribuables, créances, activité
    }

    /* ── Records ── */

    public record ReportStats(
            long totalTaxpayers, long activeTaxpayers,
            long totalDeclarations, long validatedDeclarations, long paidDeclarations,
            long totalDebts, long overdueDebts, long paidDebts,
            long totalPayments, BigDecimal totalCollected, BigDecimal totalOutstanding,
            long totalReceipts, BigDecimal receiptTotalAmount, long validReceipts
    ) {
    }

    public record DeclarationReportStats(
            long total, long draft, long submitted, long underReview,
            long validated, long rejected, long paid, long aCorriger,
            BigDecimal declaredAmount, BigDecimal paidAmount, BigDecimal remaining
    ) {
    }

    public record DebtReportStats(
            long total, long overdue, long inCollection, long paid,
            BigDecimal totalAmount, BigDecimal collected, BigDecimal outstanding, double collectionRate
    ) {
    }
}
