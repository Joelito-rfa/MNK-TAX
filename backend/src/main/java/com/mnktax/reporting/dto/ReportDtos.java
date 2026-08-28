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
            List<Map<String, Object>> overdueByTaxType,
            long newTaxpayers,
            long newDeclarations,
            long declarationsToProcess,
            List<Map<String, Object>> recentActivity,
            List<Map<String, Object>> nextCollectionActions,
            BigDecimal periodCollected,
            long periodPaymentCount,
            long periodDeclarationCount,
            long periodTaxpayerCount,
            List<Map<String, Object>> topTaxpayersByCollected,
            List<Map<String, Object>> debtsByStatusDetail,
            long receiptCount,
            BigDecimal receiptTotalAmount,
            long todayReceiptCount,
            List<Map<String, Object>> taxpayersByMonth,
            List<Map<String, Object>> declarationsByMonth,
            List<Map<String, Object>> receiptsByMonth
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
