package com.mnktax.payment.repository;

import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByReference(String reference);

    @Query("""
            SELECT p FROM Payment p
            LEFT JOIN p.taxpayer t
            LEFT JOIN p.debt d
            LEFT JOIN p.declaration decl
            WHERE (:status IS NULL OR p.status = :status)
              AND (:taxpayerId IS NULL OR p.taxpayer.id = :taxpayerId)
              AND (:method IS NULL OR p.method = :method)
              AND (:from IS NULL OR p.paymentDate >= :from)
              AND (:to IS NULL OR p.paymentDate <= :to)
              AND (:debtId IS NULL OR d.id = :debtId)
              AND (:declarationId IS NULL OR decl.id = :declarationId)
              AND (:taxTypeCode IS NULL OR EXISTS (
                     SELECT 1 FROM PaymentAllocation pa
                     WHERE pa.payment = p AND pa.debt.taxType.code = :taxTypeCode))
              AND (:center IS NULL OR EXISTS (
                     SELECT 1 FROM com.mnktax.debt.entity.TaxDebt td
                     WHERE td = d AND td.taxpayerCenter = :center))
              AND (:q IS NULL OR LOWER(p.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(decl.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(p.transactionReference) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Payment> search(@Param("status") PaymentStatus status,
                         @Param("taxpayerId") Long taxpayerId,
                         @Param("method") String method,
                         @Param("from") LocalDate from,
                         @Param("to") LocalDate to,
                         @Param("q") String q,
                         @Param("debtId") Long debtId,
                         @Param("taxTypeCode") String taxTypeCode,
                         @Param("declarationId") Long declarationId,
                         @Param("center") String center,
                         Pageable pageable);

    List<Payment> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    long countByTaxpayerId(Long taxpayerId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status NOT IN ('CANCELLED', 'REJECTED') " +
            "AND p.paymentDate BETWEEN :from AND :to")
    java.math.BigDecimal sumAllocatedBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status NOT IN ('CANCELLED', 'REJECTED') " +
            "AND p.paymentDate BETWEEN :from AND :to")
    long countAllocatedBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT p.paymentDate, p.amount FROM Payment p WHERE p.status NOT IN ('CANCELLED', 'REJECTED')")
    List<Object[]> findAllPaymentDates();

    @Query("""
            SELECT p.taxpayer.id, p.taxpayer.name, p.taxpayer.nif, SUM(p.amount)
            FROM Payment p
            WHERE p.status NOT IN ('CANCELLED', 'REJECTED') AND p.paymentDate BETWEEN :from AND :to
            GROUP BY p.taxpayer.id, p.taxpayer.name, p.taxpayer.nif
            """)
    List<Object[]> sumByTaxpayerBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    List<Payment> findTop10ByOrderByCreatedAtDesc();

    @Query("""
            SELECT pa.debt.taxType.code, SUM(pa.amount) FROM PaymentAllocation pa
            JOIN pa.payment p
            WHERE p.status NOT IN ('CANCELLED', 'REJECTED') AND p.paymentDate BETWEEN :from AND :to
            GROUP BY pa.debt.taxType.code
            """)
    List<Object[]> sumAllocatedByTaxTypeBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    /* ── Stats ─────────────────────────────────────────────────────── */

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status NOT IN ('CANCELLED', 'REJECTED') " +
            "AND p.paymentDate = :date")
    long countByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status NOT IN ('CANCELLED', 'REJECTED') " +
            "AND p.paymentDate BETWEEN :from AND :to")
    long countByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status NOT IN ('CANCELLED', 'REJECTED') " +
            "AND p.paymentDate BETWEEN :from AND :to")
    java.math.BigDecimal sumAmountByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(p.amount - p.allocatedAmount), 0) FROM Payment p " +
            "WHERE p.status IN ('ALLOCATED', 'PARTIALLY_ALLOCATED') AND p.amount > COALESCE(p.allocatedAmount, 0)")
    java.math.BigDecimal sumUnallocated();

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status = :status")
    long countByStatus(@Param("status") PaymentStatus status);
}
