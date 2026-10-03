package com.mnktax.assessment.repository;

import com.mnktax.assessment.entity.Assessment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {

    Optional<Assessment> findByReference(String reference);

    Optional<Assessment> findByDeclarationId(Long declarationId);

    List<Assessment> findByParentId(Long parentId);

    List<Assessment> findByTaxpayerIdAndTaxTypeIdAndPeriod(Long taxpayerId, Long taxTypeId, String period);

    @Query("SELECT a FROM Assessment a LEFT JOIN FETCH a.declaration d LEFT JOIN FETCH a.taxpayer t "
            + "LEFT JOIN FETCH a.taxType tt LEFT JOIN FETCH a.parent p WHERE a.id = :id")
    Optional<Assessment> findByIdFetch(@Param("id") Long id);

    @Query("""
            SELECT a FROM Assessment a
            LEFT JOIN a.taxpayer t
            WHERE (:taxpayerId IS NULL OR a.taxpayer.id = :taxpayerId)
              AND (:taxTypeCode IS NULL OR a.taxType.code = :taxTypeCode)
              AND (:period IS NULL OR a.period LIKE CONCAT('%', :period, '%'))
              AND (:status IS NULL OR a.status = :status)
              AND (:origin IS NULL OR a.origin = :origin)
              AND (:ruleCode IS NULL OR LOWER(a.ruleCode) LIKE LOWER(CONCAT('%', :ruleCode, '%')))
              AND (:q IS NULL OR LOWER(a.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Assessment> search(@Param("taxpayerId") Long taxpayerId,
                            @Param("taxTypeCode") String taxTypeCode,
                            @Param("period") String period,
                            @Param("status") com.mnktax.assessment.entity.AssessmentStatus status,
                            @Param("origin") com.mnktax.assessment.entity.AssessmentOrigin origin,
                            @Param("ruleCode") String ruleCode,
                            @Param("q") String q,
                            Pageable pageable);

    default Page<Assessment> search(Long taxpayerId, String taxTypeCode, String period,
                                    String status, String origin, String ruleCode,
                                    String q, Pageable pageable) {
        com.mnktax.assessment.entity.AssessmentStatus st = null;
        com.mnktax.assessment.entity.AssessmentOrigin or = null;
        try {
            if (status != null && !status.isBlank()) {
                st = com.mnktax.assessment.entity.AssessmentStatus.valueOf(status);
            }
        } catch (IllegalArgumentException ignored) {
        }
        try {
            if (origin != null && !origin.isBlank()) {
                or = com.mnktax.assessment.entity.AssessmentOrigin.valueOf(origin);
            }
        } catch (IllegalArgumentException ignored) {
        }
        return search(taxpayerId, taxTypeCode, period, st, or, ruleCode, q, pageable);
    }

    List<Assessment> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    long countByTaxpayerId(Long taxpayerId);

    @Query("SELECT COALESCE(SUM(a.taxBase), 0) FROM Assessment a WHERE a.status <> 'ANNULEE'")
    BigDecimal sumBase();

    @Query("SELECT COALESCE(SUM(a.netTax), 0) FROM Assessment a WHERE a.status <> 'ANNULEE'")
    BigDecimal sumNet();

    @Query("SELECT a.origin, COUNT(a) FROM Assessment a GROUP BY a.origin")
    List<Object[]> countByOriginGroup();

    @Query("SELECT a.status, COUNT(a) FROM Assessment a GROUP BY a.status")
    List<Object[]> countByStatusGroup();
}
