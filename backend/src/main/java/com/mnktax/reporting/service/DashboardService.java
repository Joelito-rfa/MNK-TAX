package com.mnktax.reporting.service;

import com.mnktax.collection.repository.CollectionActionRepository;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.assessment.repository.AssessmentRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.repository.ReceiptRepository;
import com.mnktax.reporting.dto.ReportDtos.DashboardSummary;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Agrégats pour le dashboard et les rapports.
 * Utilise des requêtes agrégeées et des limites (top N) ; les données sensibles ne sortent jamais en brut.
 */
@Service
public class DashboardService {

    private static final int RECENT_LIMIT = 10;
    private static final int MONTHS_SERIES = 24;

    private final TaxpayerRepository taxpayerRepository;
    private final DeclarationRepository declarationRepository;
    private final AssessmentRepository assessmentRepository;
    private final TaxDebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final CollectionActionRepository collectionActionRepository;
    private final ReceiptRepository receiptRepository;

    public DashboardService(TaxpayerRepository taxpayerRepository, DeclarationRepository declarationRepository,
                            AssessmentRepository assessmentRepository, TaxDebtRepository debtRepository,
                            PaymentRepository paymentRepository, CollectionActionRepository collectionActionRepository,
                            ReceiptRepository receiptRepository) {
        this.taxpayerRepository = taxpayerRepository;
        this.declarationRepository = declarationRepository;
        this.assessmentRepository = assessmentRepository;
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
        this.collectionActionRepository = collectionActionRepository;
        this.receiptRepository = receiptRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummary summary(int months) {
        LocalDate today = LocalDate.now();
        int seriesMonths = months <= 0 ? MONTHS_SERIES : months * 2;
        LocalDate periodStart = months <= 0 ? LocalDate.of(2000, 1, 1)
                : today.minusMonths(months - 1L).withDayOfMonth(1);
        Instant sincePeriod = periodStart.atStartOfDay(ZoneOffset.UTC).toInstant();

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

        long overdueDebts = debtRepository.countByStatus(DebtStatus.OVERDUE)
                + debtRepository.countByStatus(DebtStatus.IN_COLLECTION);
        long declarationsToProcess = declarationRepository.countByStatus(DeclarationStatus.SUBMITTED)
                + declarationRepository.countByStatus(DeclarationStatus.UNDER_REVIEW)
                + declarationRepository.countByStatus(DeclarationStatus.A_CORRIGER);

        BigDecimal periodCollected = paymentRepository.sumAllocatedBetween(periodStart, today);
        long periodPayments = paymentRepository.countAllocatedBetween(periodStart, today);
        long periodDeclarations = declarationRepository.countCreatedSince(sincePeriod);
        long periodTaxpayers = taxpayerRepository.countCreatedSince(sincePeriod);

        return new DashboardSummary(
                taxpayerRepository.totalTaxpayers(),
                declarationRepository.count(),
                assessmentRepository.count(),
                debtRepository.count(),
                overdueDebts,
                paymentRepository.count(),
                totalDue,
                totalCollected,
                totalOutstanding,
                overdueBalance,
                monthPayments,
                collectionRate,
                paymentsByMonth(seriesMonths),
                debtsByStatus(),
                collectionByTaxType(),
                paymentsByTaxType(periodStart, today),
                overdueByTaxType(),
                periodTaxpayers,
                periodDeclarations,
                declarationsToProcess,
                recentActivity(),
                nextCollectionActions(),
                periodCollected,
                periodPayments,
                periodDeclarations,
                periodTaxpayers,
                topTaxpayersByCollected(periodStart, today),
                debtsByStatusDetail(),
                receiptRepository.count(),
                receiptRepository.sumTotalAmount(),
                receiptRepository.countIssuedBetween(
                        LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant(),
                        LocalDate.now().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()),
                countByMonth(seriesMonths, taxpayerRepository::countCreatedBetween),
                countByMonth(seriesMonths, declarationRepository::countCreatedBetween),
                countByMonth(seriesMonths, receiptRepository::countCreatedBetween)
        );
    }

    /** Série mensuelle réelle (comptages) pour les sparklines du dashboard. */
    private List<Map<String, Object>> countByMonth(int months, java.util.function.BiFunction<Instant, Instant, Long> counter) {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate first = today.minusMonths(i).withDayOfMonth(1);
            LocalDate last = first.plusMonths(1);
            Map<String, Object> row = new HashMap<>();
            row.put("month", first.getYear() + "-" + String.format("%02d", first.getMonthValue()));
            row.put("count", counter.apply(
                    first.atStartOfDay(ZoneOffset.UTC).toInstant(),
                    last.atStartOfDay(ZoneOffset.UTC).toInstant()));
            rows.add(row);
        }
        return rows;
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
        return debtRepository.countByStatusGroup().stream()
                .map(r -> Map.<String, Object>of("status", ((Enum<?>) r[0]).name(), "count", r[1]))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> collectionByTaxType() {
        return debtRepository.sumTotalByTaxTypeGroup().stream()
                .map(r -> Map.<String, Object>of("taxType", r[0], "amount", r[1]))
                .sorted((a, b) -> ((BigDecimal) b.get("amount")).compareTo((BigDecimal) a.get("amount")))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> paymentsByTaxType(LocalDate from, LocalDate to) {
        return paymentRepository.sumAllocatedByTaxTypeBetween(from, to).stream()
                .map(r -> Map.<String, Object>of("taxType", r[0], "amount", r[1]))
                .sorted((a, b) -> ((BigDecimal) b.get("amount")).compareTo((BigDecimal) a.get("amount")))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> overdueByTaxType() {
        return debtRepository.sumOverdueByTaxTypeGroup(LocalDate.now()).stream()
                .map(r -> Map.<String, Object>of("taxType", r[0], "amount", r[1]))
                .sorted((a, b) -> ((BigDecimal) b.get("amount")).compareTo((BigDecimal) a.get("amount")))
                .toList();
    }

    /**
     * Flux d'activité récent : contribuables, déclarations, paiements, créances,
     * actions de recouvrement et quittances, fusionnés et triés par date.
     * Chaque source est limitée (top 10) pour éviter de charger la base en entier.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> recentActivity() {
        List<Map<String, Object>> items = new ArrayList<>();

        taxpayerRepository.findTop10ByOrderByCreatedAtDesc().forEach(t ->
                items.add(activity("TAXPAYER", "Nouveau contribuable", t.getId(), t.getId(), t.getName(), t.getNif(), t.getCreatedAt(), null)));

        declarationRepository.findTop10ByOrderByCreatedAtDesc().forEach(d ->
                items.add(activity("DECLARATION", "Déclaration enregistrée", d.getId(), d.getTaxpayer().getId(),
                        d.getTaxpayer().getName(), d.getTaxpayer().getNif(), d.getCreatedAt(), d.getDeclaredAmount())));

        paymentRepository.findTop10ByOrderByCreatedAtDesc().forEach(p ->
                items.add(activity("PAYMENT", "Paiement enregistré", p.getId(), p.getTaxpayer().getId(),
                        p.getTaxpayer().getName(), p.getTaxpayer().getNif(), p.getCreatedAt(), p.getAmount())));

        debtRepository.findTop10ByOrderByCreatedAtDesc().forEach(d ->
                items.add(activity("DEBT", "Créance créée", d.getId(), d.getTaxpayer().getId(),
                        d.getTaxpayer().getName(), d.getTaxpayer().getNif(), d.getCreatedAt(), d.getTotalAmount())));

        collectionActionRepository.findTop10ByOrderByCreatedAtDesc().forEach(a ->
                items.add(activity("COLLECTION", "Action de recouvrement", a.getId(), a.getDebt().getTaxpayer().getId(),
                        a.getDebt().getTaxpayer().getName(), a.getDebt().getTaxpayer().getNif(), a.getCreatedAt(), null)));

        receiptRepository.findTop10ByOrderByCreatedAtDesc().forEach(r ->
                items.add(activity("RECEIPT", "Quittance générée", r.getId(), r.getTaxpayer().getId(),
                        r.getTaxpayer().getName(), r.getTaxpayer().getNif(), r.getCreatedAt(), r.getAmount())));

        return items.stream()
                .sorted(Comparator.comparing((Map<String, Object> m) -> (String) m.get("date")).reversed())
                .limit(RECENT_LIMIT)
                .toList();
    }

    /** Top contribuables par montant encaissé sur la période (pour le tableau détaillé). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> topTaxpayersByCollected(LocalDate from, LocalDate to) {
        Map<Long, Object[]> rows = new LinkedHashMap<>();
        paymentRepository.sumByTaxpayerBetween(from, to).forEach(r -> {
            Long id = (Long) r[0];
            rows.put(id, new Object[]{r[1], r[2], r[3], BigDecimal.ZERO});
        });
        debtRepository.sumByTaxpayer().forEach(r -> {
            Object[] row = rows.computeIfAbsent((Long) r[0], k -> new Object[]{
                    (String) r[1], (String) r[2], BigDecimal.ZERO, BigDecimal.ZERO});
            row[3] = ((BigDecimal) row[3]).add((BigDecimal) r[3]);
        });
        return rows.entrySet().stream()
                .sorted(Comparator.comparing(e -> ((BigDecimal) e.getValue()[2]).doubleValue(), Comparator.reverseOrder()))
                .limit(6)
                .map(e -> {
                    Object[] r = e.getValue();
                    Map<String, Object> row = new HashMap<>();
                    row.put("taxpayerId", e.getKey());
                    row.put("taxpayerName", r[0]);
                    row.put("nif", r[1]);
                    row.put("collected", r[2]);
                    row.put("due", r[3]);
                    return row;
                })
                .toList();
    }

    /** Détail des créances par statut (count, montant dû, payé, solde) pour le tableau détaillé. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> debtsByStatusDetail() {
        return debtRepository.statusDetail().stream()
                .map(r -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("status", r[0]);
                    row.put("count", r[1]);
                    row.put("totalAmount", r[2]);
                    row.put("paidAmount", r[3]);
                    row.put("balance", r[4]);
                    return row;
                })
                .sorted(Comparator.comparing((Map<String, Object> r) -> ((Number) r.get("count")).longValue(), Comparator.reverseOrder()))
                .toList();
    }

    /** Prochaines actions de recouvrement planifiées (échéance la plus proche d'abord). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> nextCollectionActions() {
        return collectionActionRepository.findWithPendingNextActions().stream()
                .limit(4)
                .map(a -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", a.getId());
                    row.put("type", a.getType().name());
                    row.put("taxpayerId", a.getDebt().getTaxpayer().getId());
                    row.put("taxpayerName", a.getDebt().getTaxpayer().getName());
                    row.put("nif", a.getDebt().getTaxpayer().getNif());
                    row.put("debtReference", a.getDebt().getReference());
                    row.put("nextActionDate", a.getNextActionDate() != null ? a.getNextActionDate().toString() : null);
                    row.put("nextAction", a.getNextAction());
                    return row;
                })
                .toList();
    }

    private Map<String, Object> activity(String type, String label, Long id, Long taxpayerId, String taxpayerName,
                                         String nif, Instant date, BigDecimal amount) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("type", type);
        row.put("label", label);
        row.put("taxpayerId", taxpayerId);
        row.put("taxpayerName", taxpayerName);
        row.put("nif", nif);
        row.put("date", date != null ? date.toString() : null);
        row.put("amount", amount);
        return row;
    }
}
