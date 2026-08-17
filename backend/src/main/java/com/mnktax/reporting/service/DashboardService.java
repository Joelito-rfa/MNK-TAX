package com.mnktax.reporting.service;

import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.reporting.dto.ReportDtos.DashboardSummary;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Agrégats pour le dashboard et les rapports.
 * Utilise des requêtes agrégeées ; les données sensibles ne sortent jamais en brut.
 */
@Service
public class DashboardService {

    private final TaxpayerRepository taxpayerRepository;
    private final DeclarationRepository declarationRepository;
    private final TaxDebtRepository debtRepository;
    private final PaymentRepository paymentRepository;

    public DashboardService(TaxpayerRepository taxpayerRepository, DeclarationRepository declarationRepository,
                            TaxDebtRepository debtRepository, PaymentRepository paymentRepository) {
        this.taxpayerRepository = taxpayerRepository;
        this.declarationRepository = declarationRepository;
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummary summary() {
        LocalDate today = LocalDate.now();
        BigDecimal totalOutstanding = debtRepository.totalOutstanding();
        BigDecimal totalCollected = debtRepository.totalCollected();
        BigDecimal overdueBalance = debtRepository.totalOverdueBalance(today);
        BigDecimal monthPayments = paymentRepository.sumAllocatedBetween(
                today.withDayOfMonth(1), today);

        double collectionRate = 0d;
        BigDecimal totalDue = totalOutstanding.add(totalCollected);
        if (totalDue.signum() > 0) {
            collectionRate = totalCollected.divide(totalDue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue();
        }

        return new DashboardSummary(
                taxpayerRepository.totalTaxpayers(),
                declarationRepository.countByStatus(DeclarationStatus.VALIDATED)
                        + declarationRepository.countByStatus(DeclarationStatus.SUBMITTED),
                taxpayerRepository.totalTaxpayers(),
                debtRepository.count(),
                debtRepository.countByStatus(DebtStatus.OVERDUE)
                        + debtRepository.countByStatus(DebtStatus.IN_COLLECTION),
                paymentRepository.count(),
                totalDue,
                totalCollected,
                totalOutstanding,
                overdueBalance,
                monthPayments,
                collectionRate,
                paymentsByMonth(12),
                debtsByStatus(),
                collectionByTaxType(),
                paymentsByTaxType(),
                overdueByTaxType()
        );
    }

    public List<Map<String, Object>> paymentsByMonth(int months) {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate first = today.minusMonths(i).withDayOfMonth(1);
            LocalDate last = first.plusMonths(1).minusDays(1);
            BigDecimal sum = paymentRepository.sumAllocatedBetween(first, last);
            Map<String, Object> row = new HashMap<>();
            row.put("month", first.getYear() + "-" + String.format("%02d", first.getMonthValue()));
            row.put("amount", sum);
            rows.add(row);
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> debtsByStatus() {
        return debtRepository.findAll().stream()
                .collect(Collectors.groupingBy(TaxDebt::getStatus, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> Map.<String, Object>of("status", e.getKey().name(), "count", e.getValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> collectionByTaxType() {
        return debtRepository.findAll().stream()
                .collect(Collectors.groupingBy(d -> d.getTaxType().getCode(),
                        Collectors.summingDouble(d -> d.getTotalAmount().doubleValue())))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .map(e -> Map.<String, Object>of("taxType", e.getKey(), "amount",
                        BigDecimal.valueOf(e.getValue()).setScale(2, RoundingMode.HALF_UP)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> paymentsByTaxType() {
        return paymentRepository.findAll().stream()
                .flatMap(p -> p.getAllocations().stream())
                .collect(Collectors.groupingBy(a -> a.getDebt().getTaxType().getCode(),
                        Collectors.summingDouble(a -> a.getAmount().doubleValue())))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .map(e -> Map.<String, Object>of("taxType", e.getKey(), "amount",
                        BigDecimal.valueOf(e.getValue()).setScale(2, RoundingMode.HALF_UP)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> overdueByTaxType() {
        return debtRepository.findAll().stream()
                .filter(d -> d.getBalance().signum() > 0 && d.getDueDate().isBefore(LocalDate.now()))
                .collect(Collectors.groupingBy(d -> d.getTaxType().getCode(),
                        Collectors.summingDouble(d -> d.getBalance().doubleValue())))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .map(e -> Map.<String, Object>of("taxType", e.getKey(), "amount",
                        BigDecimal.valueOf(e.getValue()).setScale(2, RoundingMode.HALF_UP)))
                .toList();
    }
}
