package com.mnktax.debt.repository;

import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtOrigin;
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
import java.time.Instant;
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
              AND (:origin IS NULL OR d.origin = :origin)
              AND (:priority IS NULL OR d.collectionPriority = :priority)
              AND (:center IS NULL OR d.taxpayerCenter = :center)
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
                         @Param("origin") DebtOrigin origin,
                         @Param("priority") DebtCollectionPriority priority,
                         @Param("center") String center,
                         @Param("overdue") boolean overdue,
                         @Param("today") LocalDate today,
                         @Param("q") String q,
                         Pageable pageable);

    List<TaxDebt> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    List<TaxDebt> findByStatusAndDueDateBefore(DebtStatus status, LocalDate date);

    @Query("SELECT d FROM TaxDebt d WHERE d.balance > 0 AND d.dueDate < :today " +
            "AND d.status NOT IN (com.mnktax.debt.entity.DebtStatus.OVERDUE, com.mnktax.debt.entity.DebtStatus.IN_COLLECTION, com.mnktax.debt.entity.DebtStatus.DISPUTED, com.mnktax.debt.entity.DebtStatus.SUSPENDED)")
    List<TaxDebt> findToMarkOverdue(@Param("today") LocalDate today);

    long countByStatus(DebtStatus status);

    @Query("SELECT COALESCE(SUM(d.balance), 0) FROM TaxDebt d WHERE d.status <> 'CANCELLED'")
    BigDecimal totalOutstanding();

    @Query("SELECT COALESCE(SUM(d.balance), 0) FROM TaxDebt d WHERE d.dueDate < :today " +
            "AND d.status NOT IN ('PAID', 'CANCELLED')")
    BigDecimal totalOverdueBalance(@Param("today") LocalDate today);

    @Query("SELECT COALESCE(SUM(d.paidAmount), 0) FROM TaxDebt d")
    BigDecimal totalCollected();

    @Query("SELECT COALESCE(SUM(d.totalAmount), 0) FROM TaxDebt d WHERE d.status <> 'CANCELLED'")
    BigDecimal totalDebtAmount();

    long countByTaxpayerId(Long taxpayerId);

    long countByOrigin(DebtOrigin origin);

    long countByCollectionPriority(DebtCollectionPriority priority);

    @Query("SELECT d.origin, COUNT(d) FROM TaxDebt d WHERE d.status <> 'CANCELLED' GROUP BY d.origin")
    List<Object[]> countByOriginGroup();

    @Query("SELECT d.collectionPriority, COUNT(d) FROM TaxDebt d WHERE d.status NOT IN ('PAID', 'CANCELLED') GROUP BY d.collectionPriority")
    List<Object[]> countByPriorityGroup();

    @Query("SELECT COALESCE(SUM(d.paidAmount), 0) FROM TaxDebt d WHERE d.status IN ('PAID', 'PARTIALLY_PAID')")
    BigDecimal totalPaid();

    @Query("SELECT d.taxType.code, COUNT(d) FROM TaxDebt d WHERE d.status NOT IN ('CANCELLED') GROUP BY d.taxType.code")
    List<Object[]> countByTaxTypeGroup();

    @Query("""
            SELECT d.taxpayer.id, d.taxpayer.name, d.taxpayer.nif,
                   SUM(d.totalAmount), SUM(d.paidAmount), SUM(d.balance)
            FROM TaxDebt d
            WHERE d.status <> 'CANCELLED'
            GROUP BY d.taxpayer.id, d.taxpayer.name, d.taxpayer.nif
            """)
    List<Object[]> sumByTaxpayer();

    @Query("""
            SELECT d.status, COUNT(d), SUM(d.totalAmount), SUM(d.paidAmount), SUM(d.balance)
            FROM TaxDebt d
            WHERE d.status <> 'CANCELLED'
            GROUP BY d.status
            """)
    List<Object[]> statusDetail();

    List<TaxDebt> findTop10ByOrderByCreatedAtDesc();

    @Query("""
            SELECT COALESCE(SUM(d.paidAmount), 0) FROM TaxDebt d
            LEFT JOIN d.taxpayer t
            WHERE d.status <> 'CANCELLED'
              AND (:taxTypeCode IS NULL OR d.taxType.code = :taxTypeCode)
              AND (:period IS NULL OR d.period = :period)
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    BigDecimal totalCollectedFiltered(@Param("taxTypeCode") String taxTypeCode,
                                      @Param("period") String period,
                                      @Param("q") String q);

    @Query("""
            SELECT COALESCE(SUM(d.balance), 0) FROM TaxDebt d
            LEFT JOIN d.taxpayer t
            WHERE d.status <> 'CANCELLED'
              AND (:taxTypeCode IS NULL OR d.taxType.code = :taxTypeCode)
              AND (:period IS NULL OR d.period = :period)
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    BigDecimal totalOutstandingFiltered(@Param("taxTypeCode") String taxTypeCode,
                                        @Param("period") String period,
                                        @Param("q") String q);

    @Query("""
            SELECT COUNT(d) FROM TaxDebt d
            LEFT JOIN d.taxpayer t
            WHERE d.status <> 'CANCELLED'
              AND (:taxTypeCode IS NULL OR d.taxType.code = :taxTypeCode)
              AND (:period IS NULL OR d.period = :period)
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    long countFiltered(@Param("taxTypeCode") String taxTypeCode,
                       @Param("period") String period,
                       @Param("q") String q);

    boolean existsByAssessmentDeclarationIdAndStatusNot(Long declarationId, DebtStatus status);

    @Query("SELECT COUNT(d) FROM TaxDebt d WHERE d.assessment.declaration.id = :declarationId AND d.status NOT IN ('PAID', 'CANCELLED')")
    long countNonPaidByDeclarationId(@Param("declarationId") Long declarationId);

    @Query("""
            SELECT d.status, COUNT(d) FROM TaxDebt d
            WHERE d.status <> 'CANCELLED'
            GROUP BY d.status ORDER BY d.status
            """)
    List<Object[]> countByStatusGroup();

    @Query("""
            SELECT d.taxType.code, SUM(d.totalAmount) FROM TaxDebt d
            WHERE d.status <> 'CANCELLED'
            GROUP BY d.taxType.code
            """)
    List<Object[]> sumTotalByTaxTypeGroup();

    @Query("""
            SELECT d.taxType.code, SUM(d.balance) FROM TaxDebt d
            WHERE d.balance > 0 AND d.dueDate < :today
            AND d.status <> 'CANCELLED'
            GROUP BY d.taxType.code
            """)
    List<Object[]> sumOverdueByTaxTypeGroup(@Param("today") LocalDate today);
}
