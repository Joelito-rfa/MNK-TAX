package com.mnktax.receipt.dto;

import java.math.BigDecimal;

public record ReceiptStatsDto(
        long totalReceipts,
        long todayReceipts,
        long validReceipts,
        long cancelledReceipts,
        long refundedReceipts,
        long replacedReceipts,
        BigDecimal totalAmount,
        BigDecimal todayAmount,
        BigDecimal monthAmount
) {
}
