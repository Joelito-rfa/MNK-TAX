package com.mnktax.tax.engine;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.repository.TaxRuleRepository;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Résout la règle fiscale applicable à partir du contexte (contribuable, impôt,
 * régime, activité, période, date d'effet).
 */
@Component
public class RuleResolver {

    private final TaxRuleRepository taxRuleRepository;

    public RuleResolver(TaxRuleRepository taxRuleRepository) {
        this.taxRuleRepository = taxRuleRepository;
    }

    public TaxRule resolve(TaxContext context) {
        String taxpayerType = context.taxpayerType() == null ? null : context.taxpayerType().name();
        List<TaxRule> candidates = taxRuleRepository.resolve(
                context.taxType().getId(),
                taxpayerType,
                context.regimeId(),
                context.activityCode(),
                context.effectDate());
        if (candidates.isEmpty()) {
            throw new BusinessException("RULE_NOT_FOUND",
                    "Aucune règle fiscale applicable pour l'impôt " + context.taxType().getCode()
                            + " à la date " + context.effectDate()
                            + ". La règle est configurable et doit être créée dans le référentiel.");
        }
        return candidates.get(0);
    }

    public TaxRule resolveOrNull(TaxContext context) {
        try {
            return resolve(context);
        } catch (BusinessException ex) {
            return null;
        }
    }
}
