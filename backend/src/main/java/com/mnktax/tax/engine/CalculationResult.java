package com.mnktax.tax.engine;

import com.mnktax.tax.entity.TaxRule;

import java.math.BigDecimal;

/**
 * Résultat du calcul d'imposition. La version de la règle utilisée doit être
 * archivée dans l'assessment pour garantir la traçabilité.
 */
public record CalculationResult(
        TaxRule rule,
        int ruleVersion,
        BigDecimal baseAmount,
        BigDecimal rate,
        BigDecimal grossTax,
        BigDecimal deduction,
        BigDecimal exemption,
        BigDecimal netTax
) {
}
