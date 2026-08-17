package com.mnktax.tax.repository;

import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaxRuleRepository extends JpaRepository<TaxRule, Long> {

    Optional<TaxRule> findByCode(String code);

    boolean existsByCode(String code);

    List<TaxRule> findByTaxTypeCodeOrderByEffectiveFromAsc(String taxTypeCode);

    List<TaxRule> findByActiveTrueOrderByEffectiveFromAsc();

    /**
     * Résolution de la règle applicable :
     *  - impôt identique
     *  - période de validité contenant la date d'effet
     *  - correspondance la plus précise sur type de contribuable, régime, activité
     *  - règle générique (critères NULL) en repli
     */
    @Query("""
            SELECT r FROM TaxRule r
            WHERE r.taxType.id = :taxTypeId
              AND r.active = true
              AND r.effectiveFrom <= :effectDate
              AND (r.effectiveTo IS NULL OR r.effectiveTo >= :effectDate)
              AND (
                    (:taxpayerType IS NULL AND r.taxpayerType IS NULL)
                    OR (:taxpayerType IS NOT NULL AND r.taxpayerType IS NULL)
                    OR (:taxpayerType IS NOT NULL AND r.taxpayerType = :taxpayerType)
              )
            ORDER BY
              CASE WHEN r.taxpayerType = :taxpayerType THEN 1 ELSE 0 END DESC,
              CASE WHEN r.regime.id = :regimeId THEN 1 ELSE 0 END DESC,
              CASE WHEN (:activityCode IS NOT NULL AND r.activityCode = :activityCode) THEN 1 ELSE 0 END DESC,
              CASE WHEN r.regime.id IS NULL AND r.activityCode IS NULL THEN 0 ELSE 1 END,
              r.effectiveFrom DESC
            """)
    List<TaxRule> resolve(@Param("taxTypeId") Long taxTypeId,
                          @Param("taxpayerType") String taxpayerType,
                          @Param("regimeId") Long regimeId,
                          @Param("activityCode") String activityCode,
                          @Param("effectDate") LocalDate effectDate);

    @Query("SELECT r FROM TaxRule r WHERE r.taxType = :taxType AND r.active = true AND r.effectiveFrom <= :date " +
            "AND (r.effectiveTo IS NULL OR r.effectiveTo >= :date) ORDER BY r.effectiveFrom DESC")
    List<TaxRule> findApplicable(@Param("taxType") TaxType taxType, @Param("date") LocalDate date);
}
