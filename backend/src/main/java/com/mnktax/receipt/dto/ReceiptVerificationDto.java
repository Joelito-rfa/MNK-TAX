package com.mnktax.receipt.dto;

import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.receipt.entity.ReceiptStatus;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Données exposées par la page publique de vérification de quittance.
 * Ne contient aucune donnée sensible.
 */
public record ReceiptVerificationDto(
        String reference,
        String receiptNumber,
        String nif,
        String taxpayerName,
        String taxTypeCode,
        String period,
        BigDecimal amount,
        PaymentMethod method,
        ReceiptStatus status,
        Instant issuedAt,
        String paymentReference,
        String centerCode,
        boolean valid
) {
}
