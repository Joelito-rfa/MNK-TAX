package com.mnktax.receipt.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.receipt.dto.ReceiptDto;
import com.mnktax.receipt.dto.ReceiptVerificationDto;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.repository.ReceiptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.Instant;

@Service
public class ReceiptService {

    private static final Logger log = LoggerFactory.getLogger(ReceiptService.class);

    private final ReceiptRepository receiptRepository;
    private final QrCodeService qrCodeService;
    private final PaymentAllocationRepository allocationRepository;
    private final AuditService auditService;
    private final ReceiptPdfService pdfService;

    @Value("${mnk-tax.receipt.base-url:http://localhost:5177}")
    private String baseUrl;

    @Value("${mnk-tax.receipt.storage-dir:./data/receipts}")
    private String storageDir;

    public ReceiptService(ReceiptRepository receiptRepository, QrCodeService qrCodeService,
                          PaymentAllocationRepository allocationRepository, AuditService auditService,
                          ReceiptPdfService pdfService) {
        this.receiptRepository = receiptRepository;
        this.qrCodeService = qrCodeService;
        this.allocationRepository = allocationRepository;
        this.auditService = auditService;
        this.pdfService = pdfService;
    }

    @Transactional
    public Receipt generate(Payment payment) {
        com.mnktax.debt.entity.TaxDebt debt = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId())
                .stream()
                .findFirst()
                .map(PaymentAllocation::getDebt)
                .orElseThrow(() -> new IllegalStateException("Aucune allocation pour ce paiement : " + payment.getReference()));
        Receipt receipt = Receipt.builder()
                .reference(ReferenceGenerator.next("REC"))
                .receiptNumber(ReferenceGenerator.documentRef("QU"))
                .payment(payment)
                .taxpayer(payment.getTaxpayer())
                .taxType(debt.getTaxType())
                .period(debt.getPeriod())
                .amount(payment.getAllocatedAmount())
                .method(payment.getMethod())
                .status(ReceiptStatus.ISSUED)
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

    private String generateQr(Receipt receipt) {
        String verifyUrl = baseUrl + "/verify/receipt/" + receipt.getReference();
        try {
            Path dir = Path.of(storageDir).toAbsolutePath();
            Path file = qrCodeService.generate(verifyUrl, 220, dir);
            return file.toString();
        } catch (Exception ex) {
            log.warn("QR code non généré : {}", ex.getMessage());
            return null;
        }
    }

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
    public Page<ReceiptDto> search(Long taxpayerId, String q, Pageable pageable) {
        return receiptRepository.search(taxpayerId, blankToNull(q), pageable).map(this::toDto);
    }

    @Transactional
    public ReceiptVerificationDto verify(String reference) {
        Receipt receipt = receiptRepository.findByReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", reference));
        if (receipt.getVerifiedAt() == null) {
            receipt.setVerifiedAt(Instant.now());
            receiptRepository.save(receipt);
        }
        boolean valid = receipt.getStatus() == ReceiptStatus.ISSUED
                && receipt.getPayment().getStatus() == com.mnktax.payment.entity.PaymentStatus.ALLOCATED;
        return new ReceiptVerificationDto(receipt.getReference(), receipt.getReceiptNumber(),
                receipt.getTaxpayer().getNif(), receipt.getTaxpayer().getName(),
                receipt.getTaxType().getCode(), receipt.getPeriod(), receipt.getAmount(),
                receipt.getMethod(), receipt.getStatus(), receipt.getIssuedAt(), valid);
    }

    public java.util.List<Receipt> listByTaxpayer(Long taxpayerId) {
        return receiptRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
    }

    @Transactional(readOnly = true)
    public byte[] pdf(Long id) {
        Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quittance", id));
        return pdfService.generate(receipt);
    }

    private ReceiptDto toDto(Receipt r) {
        return ReceiptDto.from(r, baseUrl + "/verify/receipt/" + r.getReference());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
