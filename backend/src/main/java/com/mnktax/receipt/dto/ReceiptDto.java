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
        Long paymentId,
        Long taxpayerId,
        String nif,
        String taxpayerName,
        String taxTypeCode,
        String period,
        BigDecimal amount,
        PaymentMethod method,
        ReceiptStatus status,
        String qrCodePath,
        Instant issuedAt,
        Instant verifiedAt,
        String verifyUrl
) {

    public static ReceiptDto from(Receipt r, String verifyUrl) {
        return new ReceiptDto(r.getId(), r.getReference(), r.getReceiptNumber(),
                r.getPayment().getId(), r.getTaxpayer().getId(),
                r.getTaxpayer().getNif(), r.getTaxpayer().getName(),
                r.getTaxType().getCode(), r.getPeriod(), r.getAmount(),
                r.getMethod(), r.getStatus(), r.getQrCodePath(),
                r.getIssuedAt(), r.getVerifiedAt(), verifyUrl);
    }
}
