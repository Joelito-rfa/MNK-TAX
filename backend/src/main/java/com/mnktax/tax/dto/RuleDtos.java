package com.mnktax.tax.dto;

import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.TaxRule;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class RuleDtos {

    private RuleDtos() {
    }

    public record CreateRuleRequest(
            @NotBlank(message = "Le code est requis.") String code,
            @NotBlank(message = "Le nom est requis.") String name,
            @NotBlank(message = "Le code de l'impôt est requis.") String taxTypeCode,
            String taxpayerType,
            String regimeCode,
            String activityCode,
            @NotNull(message = "La méthode de calcul est requise.") CalculationMethod calculationMethod,
            @PositiveOrZero(message = "Le taux doit être positif ou nul.") BigDecimal rate,
            @PositiveOrZero BigDecimal minimum,
            @PositiveOrZero BigDecimal maximum,
            @PositiveOrZero BigDecimal deduction,
            @PositiveOrZero BigDecimal exemption,
            String legalReference,
            String brackets,
            boolean demo,
            @NotNull(message = "La date d'effet est requise.") LocalDate effectiveFrom,
            LocalDate effectiveTo
    ) {
    }

    public record TaxRuleDto(Long id, String code, String name, Long taxTypeId, String taxTypeCode,
                              String taxpayerType, Long regimeId, String regimeCode, String activityCode,
                              CalculationMethod calculationMethod, BigDecimal rate, BigDecimal minimum,
                              BigDecimal maximum, BigDecimal deduction, BigDecimal exemption,
                              String legalReference, String brackets, boolean demo, LocalDate effectiveFrom,
                              LocalDate effectiveTo, boolean active, int currentVersion) {

        public static TaxRuleDto from(TaxRule r, int currentVersion) {
            return new TaxRuleDto(r.getId(), r.getCode(), r.getName(),
                    r.getTaxType().getId(), r.getTaxType().getCode(),
                    r.getTaxpayerType(), r.getRegime() == null ? null : r.getRegime().getId(),
                    r.getRegime() == null ? null : r.getRegime().getCode(),
                    r.getActivityCode(), r.getCalculationMethod(), r.getRate(), r.getMinimum(),
                    r.getMaximum(), r.getDeduction(), r.getExemption(), r.getLegalReference(),
                    r.getBrackets(), r.isDemo(), r.getEffectiveFrom(), r.getEffectiveTo(), r.isActive(), currentVersion);
        }
    }

    public record TaxRuleVersionDto(Long id, Long ruleId, int versionNumber, String snapshot,
                                    String reason, String changedBy, LocalDate effectiveFrom) {
    }

    public record VersionsResult(List<TaxRuleVersionDto> versions) {
    }
}
