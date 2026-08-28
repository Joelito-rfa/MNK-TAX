package com.mnktax.declaration.repository;

import com.mnktax.declaration.entity.Declaration;
import com.mnktax.declaration.entity.DeclarationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DeclarationRepository extends JpaRepository<Declaration, Long> {

    Optional<Declaration> findByReference(String reference);

    @Query("""
            SELECT d FROM Declaration d
            LEFT JOIN FETCH d.taxpayer t
            LEFT JOIN FETCH d.taxType
            LEFT JOIN FETCH d.taxCenter
            WHERE (:status IS NULL OR d.status = :status)
              AND (:taxTypeCode IS NULL OR d.taxType.code = :taxTypeCode)
              AND (:period IS NULL OR d.period = :period)
              AND (:taxpayerId IS NULL OR d.taxpayer.id = :taxpayerId)
              AND (:exercice IS NULL OR d.exercice = :exercice)
              AND (:rectificative IS NULL OR d.rectificative = :rectificative)
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.businessName) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Declaration> search(@Param("status") DeclarationStatus status,
                             @Param("taxTypeCode") String taxTypeCode,
                             @Param("period") String period,
                             @Param("taxpayerId") Long taxpayerId,
                             @Param("exercice") String exercice,
                             @Param("rectificative") Boolean rectificative,
                             @Param("q") String q,
                             Pageable pageable);

    @Query("""
            SELECT d FROM Declaration d
            LEFT JOIN FETCH d.taxpayer t
            LEFT JOIN FETCH d.taxType
            LEFT JOIN FETCH d.taxCenter
            LEFT JOIN FETCH d.declarationOrigine
            WHERE d.id = :id
            """)
    Optional<Declaration> findByIdFetchAll(@Param("id") Long id);

    List<Declaration> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    long countByStatus(DeclarationStatus status);

    long countByTaxpayerId(Long taxpayerId);

    boolean existsByTaxpayerIdAndTaxTypeCodeAndPeriodAndStatusNot(
            Long taxpayerId, String taxTypeCode, String period, DeclarationStatus status);

    boolean existsByTaxpayerIdAndTaxTypeCodeAndExerciceAndPeriodAndIdNot(
            Long taxpayerId, String taxTypeCode, String exercice, String period, Long id);

    @Query("SELECT COALESCE(SUM(d.declaredAmount), 0) FROM Declaration d WHERE d.status IN ('VALIDATED', 'LIQUIDEE', 'PAYEE')")
    BigDecimal sumDeclaredAmountAll();

    @Query("SELECT COALESCE(SUM(d.montantPaye), 0) FROM Declaration d WHERE d.status = 'PAYEE'")
    BigDecimal sumPaidAmountAll();

    @Query("SELECT COALESCE(SUM(d.resteAPayer), 0) FROM Declaration d WHERE d.status IN ('VALIDATED', 'LIQUIDEE') AND d.resteAPayer > 0")
    BigDecimal sumRemainingAll();

    @Query("SELECT d FROM Declaration d WHERE d.dateEcheance BETWEEN :start AND :end AND d.status NOT IN ('PAYEE', 'CANCELLED') ORDER BY d.dateEcheance ASC")
    List<Declaration> findUpcomingDeadlines(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT d FROM Declaration d WHERE d.dateEcheance < :today AND d.status IN ('DRAFT', 'SUBMITTED', 'A_CORRIGER') ORDER BY d.dateEcheance ASC")
    List<Declaration> findOverdue(@Param("today") LocalDate today);

    @Query("SELECT COALESCE(SUM(d.declaredAmount), 0) FROM Declaration d WHERE d.status IN ('VALIDATED', 'LIQUIDEE', 'PAYEE') AND d.period LIKE CONCAT(:periodPrefix, '%')")
    BigDecimal sumDeclaredAmountByPeriod(@Param("periodPrefix") String periodPrefix);

    @Query("SELECT COALESCE(SUM(d.montantPaye), 0) FROM Declaration d WHERE d.status = 'PAYEE' AND d.period LIKE CONCAT(:periodPrefix, '%')")
    BigDecimal sumPaidAmountByPeriod(@Param("periodPrefix") String periodPrefix);

    @Query("SELECT COUNT(d) FROM Declaration d WHERE d.createdAt >= :since")
    long countCreatedSince(@Param("since") Instant since);

    @Query("SELECT COUNT(d) FROM Declaration d WHERE d.createdAt >= :from AND d.createdAt < :to")
    long countCreatedBetween(@Param("from") Instant from, @Param("to") Instant to);

    List<Declaration> findTop10ByOrderByCreatedAtDesc();
}
