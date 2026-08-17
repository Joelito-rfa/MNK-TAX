package com.mnktax.assessment.repository;

import com.mnktax.assessment.entity.Assessment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {

    Optional<Assessment> findByReference(String reference);

    Optional<Assessment> findByDeclarationId(Long declarationId);

    @Query("""
            SELECT a FROM Assessment a
            LEFT JOIN a.taxpayer t
            WHERE (:taxpayerId IS NULL OR a.taxpayer.id = :taxpayerId)
              AND (:taxTypeCode IS NULL OR a.taxType.code = :taxTypeCode)
              AND (:period IS NULL OR a.period = :period)
              AND (:q IS NULL OR LOWER(a.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Assessment> search(@Param("taxpayerId") Long taxpayerId,
                            @Param("taxTypeCode") String taxTypeCode,
                            @Param("period") String period,
                            @Param("q") String q,
                            Pageable pageable);

    List<Assessment> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    long countByTaxpayerId(Long taxpayerId);
}
