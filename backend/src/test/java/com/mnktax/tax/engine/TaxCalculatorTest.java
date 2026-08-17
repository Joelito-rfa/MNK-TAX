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
}
