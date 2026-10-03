package com.mnktax.tax.engine;

import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxRuleRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifie la requete de resolution de regle fiscale sur une base reelle (H2).
 *
 * Regression : le regime et l'activite n'etaient pris en compte qu'au tri et jamais
 * filtres, si bien qu'un contribuable du regime simplifie pouvait etre impose selon
 * la regle du regime reel.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TaxRuleRepositoryResolveTest {

    private static final LocalDate EFFECT_DATE = LocalDate.of(2026, 1, 15);
    private static final LocalDate PAST = LocalDate.of(2024, 1, 1);

    @Autowired
    private TaxRuleRepository ruleRepository;

    @Autowired
    private TaxTypeRepository taxTypeRepository;

    @Autowired
    private TaxRegimeRepository regimeRepository;

    private Long taxTypeId;
    private Long reelId;
    private Long simpId;
    private Long forfaitId;

    @BeforeEach
    void setUp() {
        String suffix = Long.toString(System.nanoTime() % 100000);
        taxTypeId = taxTypeRepository.save(TaxType.builder()
                .code("RZT" + suffix).name("Impôt test résolution").category("TEST").active(true).build())
                .getId();
        reelId = saveRegime("RGT-RL" + suffix);
        simpId = saveRegime("RGT-SP" + suffix);
        forfaitId = saveRegime("RGT-FR" + suffix);

        // Regle specifique au regime reel, sans activite.
        saveRule("RZT-REEL", reelId, null, "20");
        // Regle specifique au regime simplifie.
        saveRule("RZT-SIMP", simpId, null, "10");
        // Regle specifique a un regime tiers : ne doit jamais etre retenue.
        saveRule("RZT-FORF", forfaitId, null, "2");
        // Regle generique : repli pour tout regime non couvert.
        saveRule("RZT-GEN", null, null, "15");
        // Regle la plus specifique : regime reel + activite.
        saveRule("RZT-REEL-ACT", reelId, "ACT-1", "5");
    }

    @Test
    @DisplayName("Contribuable du regime reel : la regle du regime reel prime sur la regle generique")
    void specificRegimeBeatsGeneric() {
        assertEquals("RZT-REEL", first("COMPANY", reelId, null));
    }

    @Test
    @DisplayName("Contribuable du regime simplifie : la regle du regime simplifie est retenue")
    void simplifiedRegimePicksItsOwnRule() {
        assertEquals("RZT-SIMP", first("COMPANY", simpId, null));
    }

    @Test
    @DisplayName("Contribuable d'un regime non couvert : repli sur la regle generique")
    void uncoveredRegimeFallsBackToGeneric() {
        // Avant correction, la regle du regime reel etait retenue faute de filtre.
        assertEquals("RZT-GEN", first("COMPANY", forfaitId, null));
    }

    @Test
    @DisplayName("Activite concordante : la regle regime + activite est la plus specifique")
    void matchingActivityBeatsRegimeOnly() {
        assertEquals("RZT-REEL-ACT", first("COMPANY", reelId, "ACT-1"));
    }

    @Test
    @DisplayName("Activite non renseignee : la regle specifique par activite ne s'applique pas")
    void missingActivityExcludesActivitySpecificRule() {
        assertEquals("RZT-REEL", first("COMPANY", reelId, null));
    }

    @Test
    @DisplayName("Activite inconnue : repli sur la regle du regime, sans erreur")
    void unknownActivityFallsBackToRegimeRule() {
        assertEquals("RZT-REEL", first("COMPANY", reelId, "ACT-UNKNOWN"));
    }

    @Test
    @DisplayName("Contribuable sans regime : seule la regle generique s'applique")
    void missingRegimeExcludesRegimeSpecificRules() {
        assertEquals("RZT-GEN", first("COMPANY", null, null));
    }

    @Test
    @DisplayName("Type de contribuable sans regle dediee : aucune regle retenue")
    void noRuleForTaxpayerType() {
        List<TaxRule> candidates = resolve("PERSON", reelId, null);
        assertTrue(candidates.isEmpty(), "Une personne ne doit pas etre imposee par une regle societe");
    }

    @Test
    @DisplayName("Date d'effet anterieure a l'entree en vigueur : la regle est ignoree")
    void effectiveDateBeforeRuleStart() {
        List<TaxRule> candidates = ruleRepository.resolve(taxTypeId, "COMPANY", reelId, null,
                LocalDate.of(2023, 6, 1));
        assertTrue(candidates.isEmpty(), "Aucune regle n'est applicable avant sa date d'entree en vigueur");
    }

    private Long saveRegime(String code) {
        return regimeRepository.save(TaxRegime.builder()
                .code(code).name(code).category("TEST").vatApplicable(true).build())
                .getId();
    }

    private void saveRule(String code, Long regimeId, String activityCode, String rate) {
        ruleRepository.save(TaxRule.builder()
                .code(code).name(code)
                .taxType(taxTypeRepository.findById(taxTypeId).orElseThrow())
                .taxpayerType("COMPANY")
                .regime(regimeId == null ? null : regimeRepository.findById(regimeId).orElseThrow())
                .activityCode(activityCode)
                .calculationMethod(CalculationMethod.PERCENTAGE_OF_BASE)
                .rate(new BigDecimal(rate))
                .effectiveFrom(PAST)
                .active(true)
                .createdAt(Instant.now())
                .createdBy("test")
                .build());
    }

    private List<TaxRule> resolve(String taxpayerType, Long regimeId, String activityCode) {
        return ruleRepository.resolve(taxTypeId, taxpayerType, regimeId, activityCode, EFFECT_DATE);
    }

    private String first(String taxpayerType, Long regimeId, String activityCode) {
        List<TaxRule> candidates = resolve(taxpayerType, regimeId, activityCode);
        assertFalse(candidates.isEmpty(), "Aucune regle resolue");
        return candidates.get(0).getCode();
    }
}
