package com.mnktax.taxpayer.repository;

import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TaxpayerRepository extends JpaRepository<Taxpayer, Long> {

    Optional<Taxpayer> findByNif(String nif);

    boolean existsByNif(String nif);

    @Query("SELECT MAX(t.nif) FROM Taxpayer t")
    String findMaxNif();

    @Query("""
            SELECT t FROM Taxpayer t
            LEFT JOIN t.taxCenter tc
            LEFT JOIN t.taxRegime tr
            LEFT JOIN t.activities a
            WHERE (:q IS NULL
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.businessName) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.lastName) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.email) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.phone) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:type IS NULL OR t.type = :type)
              AND (:status IS NULL OR t.status = :status)
              AND (:taxCenterId IS NULL OR t.taxCenter.id = :taxCenterId)
              AND (:taxRegimeId IS NULL OR t.taxRegime.id = :taxRegimeId)
              AND (:activityCode IS NULL OR a.code = :activityCode)
              AND (:taxTypeCode IS NULL OR EXISTS (
                     SELECT 1 FROM com.mnktax.tax.entity.TaxObligation o
                     WHERE o.taxpayer = t AND o.taxType.code = :taxTypeCode))
            """)
    Page<Taxpayer> search(@Param("q") String q,
                          @Param("type") TaxpayerType type,
                          @Param("status") TaxpayerStatus status,
                          @Param("taxCenterId") Long taxCenterId,
                          @Param("taxRegimeId") Long taxRegimeId,
                          @Param("activityCode") String activityCode,
                          @Param("taxTypeCode") String taxTypeCode,
                          Pageable pageable);

    @Query("SELECT t FROM Taxpayer t WHERE t.nif = :nif")
    Optional<Taxpayer> findByNifStrict(@Param("nif") String nif);

    long countByStatus(TaxpayerStatus status);

    @Query("SELECT COUNT(t) FROM Taxpayer t")
    long countAll();

    @Query("SELECT COALESCE(SUM(1), 0) FROM Taxpayer t")
    long totalTaxpayers();

    @Query("SELECT COUNT(DISTINCT d.taxpayer.id) FROM TaxDebt d WHERE d.status <> 'CANCELLED'")
    long countWithDebt();

    @Query("SELECT COUNT(t) FROM Taxpayer t WHERE t.createdAt >= :since")
    long countCreatedSince(@Param("since") Instant since);

    @Query("SELECT COUNT(t) FROM Taxpayer t WHERE t.createdAt >= :from AND t.createdAt < :to")
    long countCreatedBetween(@Param("from") Instant from, @Param("to") Instant to);

    List<Taxpayer> findTop10ByOrderByCreatedAtDesc();
}
