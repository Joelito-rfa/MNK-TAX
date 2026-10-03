package com.mnktax.tax.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.TaxRule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/**
 * Calcule l'impôt brut / net à partir de la règle applicable.
 *
 * Méthodes supportées :
 * - FLAT_RATE / PERCENTAGE_OF_BASE / PERCENTAGE_OF_TURNOVER : taux unique sur l'assiette
 * - PROGRESSIVE : application de tranches progressives (brackets JSON)
 * - PER_UNIT : montant forfaitaire par unité
 */
@Component
public class TaxCalculator {

    private static final Logger log = LoggerFactory.getLogger(TaxCalculator.class);
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public CalculationResult calculate(TaxContext context, TaxRule rule, int ruleVersion) {
        BigDecimal base = context.baseAmount();
        if (base == null || base.signum() < 0) {
            throw new BusinessException("INVALID_BASE", "L'assiette de calcul doit être positive ou nulle.");
        }
        if (base.signum() == 0) {
            return new CalculationResult(rule, ruleVersion, base, rule.getRate(), BigDecimal.ZERO,
                    rule.getDeduction(), rule.getExemption(), BigDecimal.ZERO);
        }

        BigDecimal rate = rule.getRate() == null ? BigDecimal.ZERO : rule.getRate();
        BigDecimal gross = grossFor(context, base, rate, rule);
        gross = applyFloorAndCeiling(gross, rule);

        BigDecimal exemption = rule.getExemption() == null ? BigDecimal.ZERO : rule.getExemption();
        BigDecimal deduction = rule.getDeduction() == null ? BigDecimal.ZERO : rule.getDeduction();

        BigDecimal net = gross.subtract(exemption).subtract(deduction);
        if (net.signum() < 0) {
            net = BigDecimal.ZERO;
        }
        return new CalculationResult(rule, ruleVersion, base, rate,
                gross.setScale(2, RoundingMode.HALF_UP),
                deduction, exemption,
                net.setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal grossFor(TaxContext context, BigDecimal base, BigDecimal rate, TaxRule rule) {
        return switch (rule.getCalculationMethod()) {
            case FLAT_RATE, PERCENTAGE_OF_BASE, PERCENTAGE_OF_TURNOVER ->
                    base.multiply(rate).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
            case PROGRESSIVE -> calculateProgressive(base, rule);
            case PER_UNIT -> rate.multiply(base).setScale(2, RoundingMode.HALF_UP);
        };
    }

    /**
     * Calcul progressif par tranches à seuils marginaux.
     * Le champ brackets contient un JSON du type :
     * [{"upTo":50000000,"rate":0},{"upTo":100000000,"rate":10},{"upTo":null,"rate":20}]
     *
     * "upTo" est un seuil cumulé de base imposable, et non un plafond de tranche :
     * chaque taux ne s'applique qu'à la portion de l'assiette comprise entre le seuil
     * précédent et le sien. Pour une assiette de 60 000 000, la première tranche
     * (0 %) couvre 0 à 50 000 000 et la seconde (10 %) couvre 50 000 000 à
     * 60 000 000, soit un impôt de 1 000 000.
     *
     * La dernière tranche doit avoir "upTo": null (pas de seuil).
     * Les seuils sont attendus triés par ordre croissant.
     */
    private BigDecimal calculateProgressive(BigDecimal base, TaxRule rule) {
        String bracketsJson = rule.getBrackets();
        if (bracketsJson == null || bracketsJson.isBlank()) {
            // Fallback : traiter comme un taux simple si pas de tranches définies
            BigDecimal rate = rule.getRate() == null ? BigDecimal.ZERO : rule.getRate();
            return base.multiply(rate).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
        }

        List<Bracket> brackets;
        try {
            brackets = objectMapper.readValue(bracketsJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.error("Erreur parsing brackets pour la règle {}: {}", rule.getCode(), e.getMessage());
            throw new BusinessException("INVALID_BRACKETS",
                    "Format des tranches progressives invalide pour la règle " + rule.getCode());
        }

        if (brackets.isEmpty()) {
            BigDecimal rate = rule.getRate() == null ? BigDecimal.ZERO : rule.getRate();
            return base.multiply(rate).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
        }

        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal remaining = base;
        BigDecimal lowerBound = BigDecimal.ZERO;

        for (Bracket bracket : brackets) {
            if (remaining.signum() <= 0) {
                break;
            }

            // Dernière tranche (upTo null) : tout ce qui reste au-delà du seuil précédent.
            BigDecimal upperBound = bracket.upTo() == null ? base : bracket.upTo().min(base);
            if (upperBound.compareTo(lowerBound) <= 0) {
                // Tranche vide ou seuils non triés : on avance sans rien taxable.
                lowerBound = upperBound;
                continue;
            }

            BigDecimal taxableInBracket = upperBound.subtract(lowerBound).min(remaining);
            totalTax = totalTax.add(taxableInBracket.multiply(bracket.rate())
                    .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP));
            remaining = remaining.subtract(taxableInBracket);
            lowerBound = upperBound;
        }

        return totalTax;
    }

    private BigDecimal applyFloorAndCeiling(BigDecimal gross, TaxRule rule) {
        BigDecimal result = gross;
        if (rule.getMinimum() != null && rule.getMinimum().signum() > 0
                && result.compareTo(rule.getMinimum()) < 0) {
            result = rule.getMinimum();
        }
        // Un plafond nul ou négatif est ignoré : il proviendrait d'une saisie
        // accidentelle et ramènerait à 0 tout impôt positif. Un impôt nul
        // s'exprime via une exonération.
        if (rule.getMaximum() != null && rule.getMaximum().signum() > 0
                && result.compareTo(rule.getMaximum()) > 0) {
            result = rule.getMaximum();
        }
        return result;
    }

    public record Bracket(BigDecimal upTo, BigDecimal rate) {
    }
}
