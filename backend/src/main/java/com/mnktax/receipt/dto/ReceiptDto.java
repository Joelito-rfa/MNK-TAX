package com.mnktax.receipt.dto;

import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.entity.ReceiptStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record ReceiptDto(
        Long id,
        String reference,
        String receiptNumber,
        String verificationToken,
        Long paymentId,
        String paymentReference,
        Long taxpayerId,
        String nif,
        String taxpayerName,
        Long declarationId,
        String declarationReference,
        Long debtId,
        String debtReference,
        String taxTypeCode,
        String period,
        BigDecimal amount,
        String currency,
        PaymentMethod method,
        String transactionReference,
        ReceiptStatus status,
        String qrCodePath,
        String pdfPath,
        int downloadCount,
        String paymentDate,
        String centerCode,
        String createdBy,
        Instant issuedAt,
        Instant verifiedAt,
        String cancelledReason,
        String cancelledBy,
        Instant cancelledAt,
        String replacedByReference,
        Instant replacedAt,
        String refundReference,
        String verifyUrl
) {

    public static ReceiptDto from(Receipt r, String verifyUrl) {
        return new ReceiptDto(
                r.getId(),
                r.getReference(),
                r.getReceiptNumber(),
                r.getVerificationToken(),
                r.getPayment() != null ? r.getPayment().getId() : null,
                r.getPayment() != null ? r.getPayment().getReference() : null,
                r.getTaxpayer().getId(),
                r.getTaxpayer().getNif(),
                r.getTaxpayer().getName(),
                r.getDeclaration() != null ? r.getDeclaration().getId() : null,
                r.getDeclaration() != null ? r.getDeclaration().getReference() : null,
                r.getDebt() != null ? r.getDebt().getId() : null,
                r.getDebt() != null ? r.getDebt().getReference() : null,
                r.getTaxType().getCode(),
                r.getPeriod(),
                r.getAmount(),
                r.getCurrency() != null ? r.getCurrency() : "MGA",
                r.getMethod(),
                r.getTransactionReference(),
                r.getStatus(),
                r.getQrCodePath(),
                r.getPdfPath(),
                r.getDownloadCount(),
                r.getPaymentDate() != null ? r.getPaymentDate().toString() : null,
                r.getCenterCode(),
                r.getCreatedBy(),
                r.getIssuedAt(),
                r.getVerifiedAt(),
                r.getCancelledReason(),
                r.getCancelledBy(),
                r.getCancelledAt(),
                r.getReplacedByReference(),
                r.getReplacedAt(),
                r.getRefundReference(),
                verifyUrl
        );
    }
}
