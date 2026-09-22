package com.mnktax.ai.service;

import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Accès aux données pour les réponses <em>filtrées</em> de M-TAX AI.
 *
 * Permet de résoudre un contribuable par son NIF (entité mémorisée) et de calculer
 * sa situation réelle (créances, montants, retards) au lieu de renvoyer des
 * agrégats globaux.
 */
@Service
public class AiDataService {

    private final TaxpayerRepository taxpayerRepository;
    private final TaxDebtRepository debtRepository;
    private final PaymentRepository paymentRepository;

    public AiDataService(TaxpayerRepository taxpayerRepository, TaxDebtRepository debtRepository,
                         PaymentRepository paymentRepository) {
        this.taxpayerRepository = taxpayerRepository;
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
    }

    public record TaxpayerSnapshot(
            String nif,
            String name,
            String type,
            String status,
            long debtCount,
            long overdueCount,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal balance
    ) {
    }

    /**
     * Situation consolidée d'un contribuable identifié par son NIF.
     * Renvoie {@link Optional#empty()} si aucun contribuable ne porte ce NIF.
     */
    @Transactional(readOnly = true)
    public Optional<TaxpayerSnapshot> findByNif(String nif) {
        if (nif == null || nif.isBlank()) return Optional.empty();
        return taxpayerRepository.findByNif(nif).map(taxpayer -> {
            List<TaxDebt> debts = debtRepository.findByTaxpayerIdOrderByIdDesc(taxpayer.getId());

            BigDecimal total = BigDecimal.ZERO;
            BigDecimal paid = BigDecimal.ZERO;
            BigDecimal balance = BigDecimal.ZERO;
            long activeDebts = 0;
            long overdueDebts = 0;
            LocalDate today = LocalDate.now();

            for (TaxDebt debt : debts) {
                if (debt.getStatus() == DebtStatus.CANCELLED) continue;
                activeDebts++;
                total = total.add(zeroIfNull(debt.getTotalAmount()));
                paid = paid.add(zeroIfNull(debt.getPaidAmount()));
                BigDecimal remaining = zeroIfNull(debt.getBalance());
                balance = balance.add(remaining);
                if (remaining.signum() > 0 && debt.getDueDate() != null && debt.getDueDate().isBefore(today)) {
                    overdueDebts++;
                }
            }

            return new TaxpayerSnapshot(
                    taxpayer.getNif(),
                    taxpayer.getName(),
                    taxpayer.getType() != null ? taxpayer.getType().name() : "—",
                    taxpayer.getStatus() != null ? taxpayer.getStatus().name() : "—",
                    activeDebts,
                    overdueDebts,
                    total,
                    paid,
                    balance);
        });
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /* ── Filtres par période fiscale / plage de dates ── */

    public record DebtAggregate(
            long debtCount,
            BigDecimal totalAmount,
            BigDecimal collectedAmount,
            BigDecimal balance
    ) {
    }

    public record PaymentAggregate(
            long paymentCount,
            BigDecimal amount
    ) {
    }

    /**
     * Agrégat réel des créances pour une période fiscale (ex. « 2026-03 ») et/ou une
     * plage d'émission, éventuellement restreint à un type d'impôt.
     */
    @Transactional(readOnly = true)
    public DebtAggregate debtAggregate(String taxTypeCode, String fiscalPeriod, LocalDate from, LocalDate to) {
        String period = isBlank(fiscalPeriod) ? null : fiscalPeriod;
        String taxType = isBlank(taxTypeCode) ? null : taxTypeCode;
        Object[] row = debtRepository.debtAggregate(from, to, period, taxType);
        if (row == null || row.length == 0) {
            return new DebtAggregate(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        Object[] values = (row.length == 1 && row[0] instanceof Object[] nested) ? nested : row;
        return new DebtAggregate(
                toLong(values[0]),
                toBigDecimal(values[1]),
                toBigDecimal(values[2]),
                toBigDecimal(values[3]));
    }

    /** Paiements encaissés sur une plage de dates donnée. */
    @Transactional(readOnly = true)
    public PaymentAggregate paymentsBetween(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            return new PaymentAggregate(0, BigDecimal.ZERO);
        }
        return new PaymentAggregate(
                paymentRepository.countAllocatedBetween(from, to),
                zeroIfNull(paymentRepository.sumAllocatedBetween(from, to)));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Conversion tolérante : selon la base, SUM/COALESCE peut revenir en Decimal, Long ou Double. */
    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return new BigDecimal(number.toString());
        return BigDecimal.ZERO;
    }

    private static long toLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }
}
