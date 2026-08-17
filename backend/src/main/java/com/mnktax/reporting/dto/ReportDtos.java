package com.mnktax.reporting.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class ReportDtos {

    private ReportDtos() {
    }

    public record DashboardSummary(
            long taxpayerCount,
            long declarationCount,
            long assessmentCount,
            long debtCount,
            long overdueCount,
            long paymentCount,
            BigDecimal totalDebts,
            BigDecimal totalCollected,
            BigDecimal totalOutstanding,
            BigDecimal overdueBalance,
            BigDecimal currentMonthPayments,
            double collectionRate,
            List<Map<String, Object>> paymentsByMonth,
            List<Map<String, Object>> debtsByStatus,
            List<Map<String, Object>> collectionByTaxType,
            List<Map<String, Object>> paymentsByTaxType,
            List<Map<String, Object>> overdueByTaxType
    ) {
    }

    public record CollectionReportRow(
            String reference,
            String nif,
            String taxpayerName,
            String taxTypeCode,
            String period,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal balance,
            String status,
            String dueDate
    ) {
    }
}
