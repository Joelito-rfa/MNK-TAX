package com.mnktax.debt.repository;

import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaxDebtRepository extends JpaRepository<TaxDebt, Long> {

    Optional<TaxDebt> findByReference(String reference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM TaxDebt d WHERE d.id = :id")
    Optional<TaxDebt> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT d FROM TaxDebt d
            LEFT JOIN d.taxpayer t
            WHERE (:status IS NULL OR d.status = :status)
              AND (:taxTypeCode IS NULL OR d.taxType.code = :taxTypeCode)
              AND (:period IS NULL OR d.period = :period)
              AND (:taxpayerId IS NULL OR d.taxpayer.id = :taxpayerId)
              AND (:overdue = false OR d.status IN (com.mnktax.debt.entity.DebtStatus.OVERDUE,
                                                     com.mnktax.debt.entity.DebtStatus.IN_COLLECTION)
                    OR (d.balance > 0 AND d.dueDate < :today))
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<TaxDebt> search(@Param("status") DebtStatus status,
                         @Param("taxTypeCode") String taxTypeCode,
                         @Param("period") String period,
                         @Param("taxpayerId") Long taxpayerId,
                         @Param("overdue") boolean overdue,
                         @Param("today") LocalDate today,
                         @Param("q") String q,
                         Pageable pageable);

    List<TaxDebt> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    List<TaxDebt> findByStatusAndDueDateBefore(DebtStatus status, LocalDate date);

    @Query("SELECT d FROM TaxDebt d WHERE d.balance > 0 AND d.dueDate < :today " +
            "AND d.status NOT IN (com.mnktax.debt.entity.DebtStatus.OVERDUE, com.mnktax.debt.entity.DebtStatus.IN_COLLECTION, com.mnktax.debt.entity.DebtStatus.DISPUTED)")
    List<TaxDebt> findToMarkOverdue(@Param("today") LocalDate today);

    long countByStatus(DebtStatus status);

    @Query("SELECT COALESCE(SUM(d.balance), 0) FROM TaxDebt d WHERE d.status <> 'CANCELLED'")
    BigDecimal totalOutstanding();

    @Query("SELECT COALESCE(SUM(d.balance), 0) FROM TaxDebt d WHERE d.dueDate < :today " +
            "AND d.status NOT IN ('PAID', 'CANCELLED')")
    BigDecimal totalOverdueBalance(@Param("today") LocalDate today);

    @Query("SELECT COALESCE(SUM(d.paidAmount), 0) FROM TaxDebt d")
    BigDecimal totalCollected();

    long countByTaxpayerId(Long taxpayerId);
}
