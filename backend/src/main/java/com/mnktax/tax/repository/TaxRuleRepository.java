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
     *  - règle active et période de validité contenant la date d'effet
     *  - type de contribuable, régime et activité : une règle ne s'applique que si son
     *    critère est NULL (règle générique) ou identique à celui du contribuable.
     *    Un contributeur dont le régime ou l'activité n'est pas renseigné ne peut donc
     *    pas être rattaché à une règle spécifique sur ce critère.
     *  - tri par spécificité décroissante (nombre de critères renseignés), puis
     *    date d'effet la plus récente
     */
    @Query("""
            SELECT r FROM TaxRule r
            WHERE r.taxType.id = :taxTypeId
              AND r.active = true
              AND r.effectiveFrom <= :effectDate
              AND (r.effectiveTo IS NULL OR r.effectiveTo >= :effectDate)
              AND (r.taxpayerType IS NULL OR r.taxpayerType = :taxpayerType)
              AND (r.regime IS NULL OR r.regime.id = :regimeId)
              AND (r.activityCode IS NULL OR r.activityCode = :activityCode)
            ORDER BY
              CASE WHEN r.taxpayerType IS NOT NULL THEN 1 ELSE 0 END DESC,
              CASE WHEN r.regime IS NOT NULL THEN 1 ELSE 0 END DESC,
              CASE WHEN r.activityCode IS NOT NULL THEN 1 ELSE 0 END DESC,
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
