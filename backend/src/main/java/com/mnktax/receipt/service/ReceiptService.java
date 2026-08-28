package com.mnktax.receipt.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.receipt.dto.ReceiptDto;
import com.mnktax.receipt.dto.ReceiptStatsDto;
import com.mnktax.receipt.dto.ReceiptVerificationDto;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.repository.ReceiptRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class ReceiptService {

    private static final Logger log = LoggerFactory.getLogger(ReceiptService.class);

    private final ReceiptRepository receiptRepository;
    private final QrCodeService qrCodeService;
    private final PaymentAllocationRepository allocationRepository;
    private final PaymentRepository paymentRepository;
    private final AuditService auditService;
    private final ReceiptPdfService pdfService;

    @Value("${mnk-tax.receipt.base-url:http://localhost:5177}")
    private String baseUrl;

    @Value("${mnk-tax.receipt.storage-dir:./data/receipts}")
    private String storageDir;

    public ReceiptService(ReceiptRepository receiptRepository, QrCodeService qrCodeService,
                          PaymentAllocationRepository allocationRepository, PaymentRepository paymentRepository,
                          AuditService auditService, ReceiptPdfService pdfService) {
        this.receiptRepository = receiptRepository;
        this.qrCodeService = qrCodeService;
        this.allocationRepository = allocationRepository;
        this.paymentRepository = paymentRepository;
        this.auditService = auditService;
        this.pdfService = pdfService;
    }

    /* ── Génération ─────────────────────────────────────────── */

    @Transactional
    public Receipt generate(Payment payment) {
        com.mnktax.debt.entity.TaxDebt debt = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId())
                .stream()
                .findFirst()
                .map(PaymentAllocation::getDebt)
                .orElse(null);

        // Déclaratin liée
        com.mnktax.declaration.entity.Declaration declaration = payment.getDeclaration();
        if (declaration == null && debt != null && debt.getAssessment() != null
                && debt.getAssessment().getDeclaration() != null) {
            declaration = debt.getAssessment().getDeclaration();
        }

        String centerCode = null;
        if (debt != null && debt.getTaxpayerCenter() != null) {
            centerCode = debt.getTaxpayerCenter();
        } else if (payment.getTaxpayer() != null && payment.getTaxpayer().getTaxCenter() != null) {
            centerCode = payment.getTaxpayer().getTaxCenter().getCode();
        }

        Receipt receipt = Receipt.builder()
                .reference(ReferenceGenerator.next("REC"))
                .verificationToken(generateToken())
                .receiptNumber(ReferenceGenerator.documentRef("QU"))
                .payment(payment)
                .taxpayer(payment.getTaxpayer())
                .taxType(debt != null ? debt.getTaxType() : null)
                .declaration(declaration)
                .debt(debt)
                .period(debt != null ? debt.getPeriod() : null)
                .amount(payment.getAllocatedAmount())
                .currency(payment.getCurrency() != null ? payment.getCurrency() : "MGA")
                .method(payment.getMethod())
                .transactionReference(payment.getTransactionReference())
                .status(ReceiptStatus.ISSUED)
                .paymentDate(payment.getPaymentDate())
                .centerCode(centerCode)
                .createdBy(SecurityUtils.currentUsername())
                .issuedAt(Instant.now())
                .createdAt(Instant.now())
                .build();

        String qrPath = generateQr(receipt);
        receipt.setQrCodePath(qrPath);

        Receipt saved = receiptRepository.save(receipt);
        auditService.record("RECEIPT_GENERATED", "RECEIPT", String.valueOf(saved.getId()),
                null, saved.getReference());
        return saved;
    }

    private String generateToken() {
        return "VRF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    private String generateQr(Receipt receipt) {
        String verifyUrl = baseUrl + "/verify/receipt/" + receipt.getVerificationToken();
        try {
            Path dir = Path.of(storageDir).toAbsolutePath();
            Path file = qrCodeService.generate(verifyUrl, 220, dir);
            return file.toString();
        } catch (Exception ex) {
            log.error("Erreur génération QR code pour quittance {}: {}", receipt.getReference(), ex.getMessage(), ex);
            return null;
        }
    }

    /* ── Consultation ────────────────────────────────────────── */

    @Transactional(readOnly = true)
    public ReceiptDto get(Long id) {
        Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", id));
        return toDto(receipt);
    }

    @Transactional(readOnly = true)
    public ReceiptDto getByReference(String reference) {
        Receipt receipt = receiptRepository.findByReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", reference));
        return toDto(receipt);
    }

    @Transactional(readOnly = true)
    public Page<ReceiptDto> search(ReceiptStatus status, Long taxpayerId, String taxTypeCode,
                                   String method, Instant fromDate, Instant toDate,
                                   String center, String q, Pageable pageable) {
        String q2 = (q == null || q.isBlank()) ? null : q.trim();
        String m2 = (method == null || method.isBlank()) ? null : method.trim();
        String c2 = (center == null || center.isBlank()) ? null : center.trim();
        String tc2 = (taxTypeCode == null || taxTypeCode.isBlank()) ? null : taxTypeCode.trim();
        return receiptRepository.search(status, taxpayerId, tc2, m2, fromDate, toDate, c2, q2, pageable)
                .map(this::toDto);
    }

    /* ── Vérification publique ───────────────────────────────── */

    @Transactional
    public ReceiptVerificationDto verify(String token) {
        Receipt receipt = receiptRepository.findByVerificationToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", token));
        if (receipt.getVerifiedAt() == null) {
            receipt.setVerifiedAt(Instant.now());
            receiptRepository.save(receipt);
        }
        boolean valid = (receipt.getStatus() == ReceiptStatus.ISSUED
                || receipt.getStatus() == ReceiptStatus.VALID)
                && receipt.getPayment() != null
                && receipt.getPayment().getStatus() != com.mnktax.payment.entity.PaymentStatus.CANCELLED;
        return new ReceiptVerificationDto(
                receipt.getReference(),
                receipt.getReceiptNumber(),
                receipt.getTaxpayer().getNif(),
                receipt.getTaxpayer().getName(),
                receipt.getTaxType() != null ? receipt.getTaxType().getCode() : null,
                receipt.getPeriod(),
                receipt.getAmount(),
                receipt.getMethod(),
                receipt.getStatus(),
                receipt.getIssuedAt(),
                receipt.getPayment() != null ? receipt.getPayment().getReference() : null,
                receipt.getCenterCode(),
                valid
        );
    }

    /* ── PDF & QR ────────────────────────────────────────────── */

    @Transactional
    public byte[] pdf(Long id, HttpServletRequest request) {
        Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", id));
        byte[] content = pdfService.generate(receipt);
        receipt.setDownloadCount(receipt.getDownloadCount() + 1);
        receiptRepository.save(receipt);
        auditService.record("RECEIPT_DOWNLOAD", "RECEIPT", String.valueOf(id),
                null, "PDF téléchargé", request);
        return content;
    }

    /* ── Annulation ──────────────────────────────────────────── */

    @Transactional
    public ReceiptDto cancel(Long id, String reason, HttpServletRequest request) {
        Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", id));
        if (receipt.getStatus() == ReceiptStatus.CANCELLED
                || receipt.getStatus() == ReceiptStatus.VOID
                || receipt.getStatus() == ReceiptStatus.REFUNDED
                || receipt.getStatus() == ReceiptStatus.REPLACED) {
            throw new BusinessException("INVALID_STATUS",
                    "Cette quittance est déjà " + receipt.getStatus() + " et ne peut pas être annulée.");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("VALIDATION_ERROR", "Le motif de l'annulation est obligatoire.");
        }
        ReceiptStatus oldStatus = receipt.getStatus();
        receipt.setStatus(ReceiptStatus.CANCELLED);
        receipt.setCancelledReason(reason);
        receipt.setCancelledBy(SecurityUtils.currentUsername());
        receipt.setCancelledAt(Instant.now());
        receipt.setUpdatedAt(Instant.now());
        Receipt saved = receiptRepository.save(receipt);
        auditService.record("RECEIPT_CANCEL", "RECEIPT", String.valueOf(id),
                oldStatus.name(), ReceiptStatus.CANCELLED.name(), request);
        return toDto(saved);
    }

    /* ── Remplacement ────────────────────────────────────────── */

    @Transactional
    public ReceiptDto replace(Long id, String reason, HttpServletRequest request) {
        Receipt oldReceipt = receiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", id));
        if (oldReceipt.getStatus() == ReceiptStatus.CANCELLED
                || oldReceipt.getStatus() == ReceiptStatus.VOID
                || oldReceipt.getStatus() == ReceiptStatus.REPLACED) {
            throw new BusinessException("INVALID_STATUS",
                    "Cette quittance est " + oldReceipt.getStatus() + " et ne peut pas être remplacée.");
        }
        // Créer une nouvelle quittance basée sur l'ancienne
        Receipt newReceipt = generate(oldReceipt.getPayment());
        // Marquer l'ancienne comme remplacée
        oldReceipt.setStatus(ReceiptStatus.REPLACED);
        oldReceipt.setReplacedByReference(newReceipt.getReference());
        oldReceipt.setReplacedAt(Instant.now());
        oldReceipt.setUpdatedAt(Instant.now());
        receiptRepository.save(oldReceipt);

        auditService.record("RECEIPT_REPLACE", "RECEIPT", String.valueOf(id),
                oldReceipt.getReference(), newReceipt.getReference(), request);

        return toDto(newReceipt);
    }

    /* ── Remboursement ───────────────────────────────────────── */

    @Transactional
    public ReceiptDto refund(Long id, String refundReference, HttpServletRequest request) {
        Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", id));
        if (receipt.getStatus() == ReceiptStatus.REFUNDED) {
            throw new BusinessException("ALREADY_REFUNDED", "Cette quittance est déjà remboursée.");
        }
        if (receipt.getStatus() == ReceiptStatus.CANCELLED
                || receipt.getStatus() == ReceiptStatus.VOID
                || receipt.getStatus() == ReceiptStatus.REPLACED) {
            throw new BusinessException("INVALID_STATUS",
                    "Cette quittance est " + receipt.getStatus() + " et ne peut pas être remboursée.");
        }
        ReceiptStatus oldStatus = receipt.getStatus();
        receipt.setStatus(ReceiptStatus.REFUNDED);
        receipt.setRefundReference(refundReference);
        receipt.setUpdatedAt(Instant.now());
        Receipt saved = receiptRepository.save(receipt);
        auditService.record("RECEIPT_REFUND", "RECEIPT", String.valueOf(id),
                oldStatus.name(), ReceiptStatus.REFUNDED.name(), request);
        return toDto(saved);
    }

    /* ── Statistiques ────────────────────────────────────────── */

    @Transactional(readOnly = true)
    public ReceiptStatsDto stats() {
        Instant now = Instant.now();
        Instant todayStart = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant todayEnd = LocalDate.now().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant monthEnd = LocalDate.now().plusMonths(1).withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        return new ReceiptStatsDto(
                receiptRepository.count(),
                receiptRepository.countIssuedBetween(todayStart, todayEnd),
                receiptRepository.countByStatus(ReceiptStatus.ISSUED),
                receiptRepository.countByStatus(ReceiptStatus.CANCELLED),
                receiptRepository.countByStatus(ReceiptStatus.REFUNDED),
                receiptRepository.countByStatus(ReceiptStatus.REPLACED),
                receiptRepository.sumTotalAmount(),
                receiptRepository.sumAmountBetween(todayStart, todayEnd),
                receiptRepository.sumAmountBetween(monthStart, monthEnd)
        );
    }

    /* ── Listing par contribuable ────────────────────────────── */

    public java.util.List<Receipt> listByTaxpayer(Long taxpayerId) {
        return receiptRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
    }

    /* ── Conversion DTO ──────────────────────────────────────── */

    private ReceiptDto toDto(Receipt r) {
        return ReceiptDto.from(r, baseUrl + "/verify/receipt/" + r.getVerificationToken());
    }
}
