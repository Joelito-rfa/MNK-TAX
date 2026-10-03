package com.mnktax.assessment.dto;

import com.mnktax.assessment.entity.Assessment;
import com.mnktax.assessment.entity.AssessmentHistory;
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
                                BigDecimal exemption, BigDecimal credit, BigDecimal adjustment, BigDecimal netTax,
                                LocalDate calculationDate, String ruleCode, Integer ruleVersion,
                                String computedBy, Instant createdAt,
                                String status, String origin, Long parentId, String parentReference,
                                Instant notifiedAt, Instant cancelledAt, String observations,
                                List<AssessmentLineDto> lines) {

        public static AssessmentDto from(Assessment a) {
            return new AssessmentDto(a.getId(), a.getReference(),
                    a.getDeclaration() != null ? a.getDeclaration().getId() : null,
                    a.getDeclaration() != null ? a.getDeclaration().getReference() : null,
                    a.getTaxpayer().getId(), a.getTaxpayer().getNif(), a.getTaxpayer().getName(),
                    a.getTaxType().getId(), a.getTaxType().getCode(), a.getPeriod(),
                    a.getTaxBase(), a.getGrossTax(), a.getDeduction(), a.getExemption(),
                    a.getCredit(), a.getAdjustment(),
                    a.getNetTax(), a.getCalculationDate(), a.getRuleCode(), a.getRuleVersion(),
                    a.getComputedBy(), a.getCreatedAt(),
                    a.getStatus() != null ? a.getStatus().name() : null,
                    a.getOrigin() != null ? a.getOrigin().name() : null,
                    a.getParent() != null ? a.getParent().getId() : null,
                    a.getParent() != null ? a.getParent().getReference() : null,
                    a.getNotifiedAt(), a.getCancelledAt(), a.getObservations(),
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

    public record HistoryDto(Long id, String username, String action, String oldValue,
                             String newValue, String commentaire, Instant createdAt) {
        public static HistoryDto from(AssessmentHistory h) {
            return new HistoryDto(h.getId(), h.getUsername(), h.getAction(), h.getOldValue(),
                    h.getNewValue(), h.getCommentaire(), h.getCreatedAt());
        }
    }

    public record ManualRequest(Long taxpayerId, String taxTypeCode, String period,
                                BigDecimal taxBase, BigDecimal credit, BigDecimal adjustment,
                                String observations) {
    }

    public record SimulateRequest(Long taxpayerId, String taxTypeCode, String period,
                                  BigDecimal taxBase) {
    }

    public record SimulationDto(BigDecimal base, BigDecimal rate, BigDecimal grossTax,
                                BigDecimal exemption, BigDecimal deduction, BigDecimal netTax,
                                String ruleCode, int ruleVersion) {
    }

    public record AdjustRequest(BigDecimal credit, BigDecimal adjustment, String observations) {
    }

    public record StatsDto(long total, BigDecimal baseTotal, BigDecimal netTotal,
                           java.util.List<OriginCount> byOrigin,
                           java.util.List<StatusCount> byStatus) {
        public record OriginCount(String origin, long count) {
        }

        public record StatusCount(String status, long count) {
        }
    }
}
