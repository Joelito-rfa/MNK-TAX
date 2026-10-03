package com.mnktax.tax.engine;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.TaxRule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TaxCalculatorTest {

    /** Seuils marginaux : 0 % jusqu'à 50 M, 10 % de 50 à 100 M, 20 % au-delà. */
    private static final String PROGRESSIVE_BRACKETS =
            "[{\"upTo\":50000000,\"rate\":0},{\"upTo\":100000000,\"rate\":10},{\"upTo\":null,\"rate\":20}]";

    private TaxCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new TaxCalculator();
    }

    private TaxContext context(BigDecimal base) {
        return new TaxContext(null, null, "2026-01", LocalDate.of(2026, 1, 15), base, null);
    }

    private TaxRule rule(CalculationMethod method, BigDecimal rate, BigDecimal min, BigDecimal max,
                         BigDecimal deduction, BigDecimal exemption) {
        return TaxRule.builder()
                .calculationMethod(method)
                .rate(rate)
                .minimum(min)
                .maximum(max)
                .deduction(deduction)
                .exemption(exemption)
                .build();
    }

    @Test
    @DisplayName("Taux sur l'assiette : 20 % de 1 000 000 = 200 000")
    void percentageOfBase() {
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("20"), null, null, null, null);
        CalculationResult result = calculator.calculate(context(new BigDecimal("1000000")), rule, 1);
        assertEquals(new BigDecimal("200000.00"), result.grossTax());
        assertEquals(new BigDecimal("200000.00"), result.netTax());
        assertEquals(0, result.grossTax().setScale(2, java.math.RoundingMode.HALF_UP).compareTo(new BigDecimal("200000.00")));
    }

    @Test
    @DisplayName("Exonération puis abattement : net = brut - exonération - abattement, jamais négatif")
    void exemptionThenDeduction() {
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("10"),
                null, null, new BigDecimal("50000"), new BigDecimal("100000"));
        CalculationResult result = calculator.calculate(context(new BigDecimal("1000000")), rule, 1);
        assertEquals(new BigDecimal("100000.00"), result.grossTax());
        assertEquals(new BigDecimal("0.00"), result.netTax());
    }

    @Test
    @DisplayName("Abattement partiel : net = brut - abattement")
    void partialDeduction() {
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("20"),
                null, null, new BigDecimal("100000"), null);
        CalculationResult result = calculator.calculate(context(new BigDecimal("1000000")), rule, 1);
        assertEquals(new BigDecimal("200000.00"), result.grossTax());
        assertEquals(new BigDecimal("100000.00"), result.netTax());
    }

    @Test
    @DisplayName("Plancher : l'impôt brut ne descend pas sous le minimum")
    void floorApplied() {
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("5"),
                new BigDecimal("30000"), null, null, null);
        CalculationResult result = calculator.calculate(context(new BigDecimal("1000")), rule, 1);
        assertEquals(new BigDecimal("30000.00"), result.grossTax());
    }

    @Test
    @DisplayName("Plafond : l'impôt brut ne dépasse pas le maximum")
    void ceilingApplied() {
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("20"),
                null, new BigDecimal("1000000"), null, null);
        CalculationResult result = calculator.calculate(context(new BigDecimal("9000000")), rule, 1);
        assertEquals(new BigDecimal("1000000.00"), result.grossTax());
    }

    @Test
    @DisplayName("Tarif par unité : taux × quantité")
    void perUnit() {
        TaxRule rule = rule(CalculationMethod.PER_UNIT, new BigDecimal("5000"), null, null, null, null);
        CalculationResult result = calculator.calculate(context(new BigDecimal("100")), rule, 1);
        assertEquals(new BigDecimal("500000.00"), result.grossTax());
    }

    @Test
    @DisplayName("Assiette nulle → impôt nul, sans erreur")
    void zeroBase() {
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("20"), null, null, null, null);
        CalculationResult result = calculator.calculate(context(BigDecimal.ZERO), rule, 1);
        assertEquals(0, result.grossTax().compareTo(BigDecimal.ZERO));
        assertEquals(0, result.netTax().compareTo(BigDecimal.ZERO));
    }

    @Test
    @DisplayName("Assiette négative → rejet")
    void negativeBaseRejected() {
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("20"), null, null, null, null);
        assertThrows(BusinessException.class, () -> calculator.calculate(context(new BigDecimal("-1")), rule, 1));
    }

    @Test
    @DisplayName("Plafond nul : ignoré, l'impôt n'est pas ramené à 0")
    void zeroCeilingIsIgnored() {
        // Régression : une règle saisie avec maximum = 0 taxait toutes les assiettes à 0.
        TaxRule rule = rule(CalculationMethod.PERCENTAGE_OF_BASE, new BigDecimal("20"),
                null, BigDecimal.ZERO, null, null);
        CalculationResult result = calculator.calculate(context(new BigDecimal("1000000")), rule, 1);
        assertEquals(new BigDecimal("200000.00"), result.grossTax());
        assertEquals(new BigDecimal("200000.00"), result.netTax());
    }

    @Test
    @DisplayName("Progressif à seuils marginaux : 60 M franchit 50 M à 10 % → 1 M")
    void progressiveMarginalThresholds() {
        TaxRule rule = progressiveRule(new BigDecimal("20"));
        CalculationResult result = calculator.calculate(context(new BigDecimal("60000000")), rule, 1);
        assertEquals(new BigDecimal("1000000.00"), result.grossTax());
    }

    @Test
    @DisplayName("Progressif : assiette sous le premier seuil → impôt nul")
    void progressiveBelowFirstThreshold() {
        TaxRule rule = progressiveRule(new BigDecimal("20"));
        CalculationResult result = calculator.calculate(context(new BigDecimal("40000000")), rule, 1);
        assertEquals(new BigDecimal("0.00"), result.grossTax());
    }

    @Test
    @DisplayName("Progressif : assiette au-delà du dernier seuil → 0 % + 10 % + 20 %")
    void progressiveAboveAllThresholds() {
        // 0 à 50 M à 0 %, 50 à 100 M à 10 % (5 M), 100 à 120 M à 20 % (4 M)
        TaxRule rule = progressiveRule(new BigDecimal("20"));
        CalculationResult result = calculator.calculate(context(new BigDecimal("120000000")), rule, 1);
        assertEquals(new BigDecimal("9000000.00"), result.grossTax());
    }

    @Test
    @DisplayName("Progressif sans tranches définies → repli sur le taux de la règle")
    void progressiveWithoutBracketsFallsBackToRate() {
        TaxRule rule = rule(CalculationMethod.PROGRESSIVE, new BigDecimal("20"), null, null, null, null);
        CalculationResult result = calculator.calculate(context(new BigDecimal("1000000")), rule, 1);
        assertEquals(new BigDecimal("200000.00"), result.grossTax());
    }

    @Test
    @DisplayName("Progressif : JSON de tranches invalide → rejet explicite")
    void progressiveInvalidJsonRejected() {
        TaxRule rule = TaxRule.builder()
                .calculationMethod(CalculationMethod.PROGRESSIVE)
                .rate(new BigDecimal("20"))
                .brackets("[{\"upTo\":")
                .build();
        BusinessException ex = assertThrows(BusinessException.class,
                () -> calculator.calculate(context(new BigDecimal("1000000")), rule, 1));
        assertEquals("INVALID_BRACKETS", ex.getCode());
    }

    private TaxRule progressiveRule(BigDecimal rate) {
        return TaxRule.builder()
                .code("R-TEST-PROGRESSIVE")
                .calculationMethod(CalculationMethod.PROGRESSIVE)
                .rate(rate)
                .brackets(PROGRESSIVE_BRACKETS)
                .build();
    }
}
