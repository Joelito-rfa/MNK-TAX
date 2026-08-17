package com.mnktax.assessment.dto;

import com.mnktax.assessment.entity.Assessment;
import com.mnktax.assessment.entity.AssessmentLine;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AssessmentDtos {

    private AssessmentDtos() {
    }

    public record AssessmentDto(Long id, String reference, Long declarationId, String declarationReference,
                                Long taxpayerId, String nif, String taxpayerName,
                                Long taxTypeId, String taxTypeCode, String period,
                                BigDecimal taxBase, BigDecimal grossTax, BigDecimal deduction,
                                BigDecimal credit, BigDecimal adjustment, BigDecimal netTax,
                                LocalDate calculationDate, String ruleCode, Integer ruleVersion,
                                String computedBy, Instant createdAt, List<AssessmentLineDto> lines) {

        public static AssessmentDto from(Assessment a) {
            return new AssessmentDto(a.getId(), a.getReference(),
                    a.getDeclaration().getId(), a.getDeclaration().getReference(),
                    a.getTaxpayer().getId(), a.getTaxpayer().getNif(), a.getTaxpayer().getName(),
                    a.getTaxType().getId(), a.getTaxType().getCode(), a.getPeriod(),
                    a.getTaxBase(), a.getGrossTax(), a.getDeduction(), a.getCredit(), a.getAdjustment(),
                    a.getNetTax(), a.getCalculationDate(), a.getRuleCode(), a.getRuleVersion(),
                    a.getComputedBy(), a.getCreatedAt(),
                    a.getLines().stream().map(AssessmentLineDto::from).toList());
        }
    }

    public record AssessmentLineDto(Long id, int lineNumber, String label, BigDecimal baseAmount,
                                    BigDecimal rate, BigDecimal calculatedAmount) {
        public static AssessmentLineDto from(AssessmentLine line) {
            return new AssessmentLineDto(line.getId(), line.getLineNumber(), line.getLabel(),
                    line.getBaseAmount(), line.getRate(), line.getCalculatedAmount());
        }
    }
}
