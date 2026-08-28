package com.mnktax.tax.dto;

import com.mnktax.tax.entity.DeclarationObligationStatus;
import com.mnktax.tax.entity.ObligationStatus;
import com.mnktax.tax.entity.PaymentObligationStatus;
import com.mnktax.tax.entity.Periodicity;
import com.mnktax.tax.entity.TaxObligation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class ObligationDtos {

    private ObligationDtos() {
    }

    public record CreateObligationRequest(
            @NotNull(message = "L'ID du contribuable est requis.") Long taxpayerId,
            @NotBlank(message = "Le code de l'impôt est requis.") String taxTypeCode,
            @NotNull(message = "La périodicité est requise.") Periodicity periodicity,
            @NotNull(message = "La date de début est requise.") LocalDate startDate,
            LocalDate endDate,
            Long taxRegimeId,
            Long taxCenterId,
            String period,
            LocalDate declarationDeadline,
            LocalDate paymentDeadline,
            BigDecimal expectedAmount
    ) {
    }

    public record UpdateObligationRequest(
            @NotNull(message = "La périodicité est requise.") Periodicity periodicity,
            LocalDate endDate,
            @NotNull(message = "Le statut est requis.") ObligationStatus status,
            Long taxRegimeId,
            Long taxCenterId,
            String period,
            LocalDate declarationDeadline,
            LocalDate paymentDeadline,
            BigDecimal expectedAmount,
            DeclarationObligationStatus declarationStatus,
            PaymentObligationStatus paymentStatus
    ) {
    }

    public record ObligationDto(Long id, Long taxpayerId, String taxTypeCode, String taxTypeName,
                                Long taxRegimeId, String taxRegimeName,
                                Long taxCenterId, String taxCenterName,
                                Periodicity periodicity,
                                LocalDate startDate, LocalDate endDate,
                                String period,
                                LocalDate declarationDeadline, LocalDate paymentDeadline,
                                BigDecimal expectedAmount,
                                DeclarationObligationStatus declarationStatus,
                                PaymentObligationStatus paymentStatus,
                                ObligationStatus status) {
        public static ObligationDto from(TaxObligation o) {
            return new ObligationDto(o.getId(), o.getTaxpayer().getId(),
                    o.getTaxType().getCode(), o.getTaxType().getName(),
                    o.getTaxRegime() != null ? o.getTaxRegime().getId() : null,
                    o.getTaxRegime() != null ? o.getTaxRegime().getName() : null,
                    o.getTaxCenter() != null ? o.getTaxCenter().getId() : null,
                    o.getTaxCenter() != null ? o.getTaxCenter().getName() : null,
                    o.getPeriodicity(),
                    o.getStartDate(), o.getEndDate(),
                    o.getPeriod(),
                    o.getDeclarationDeadline(), o.getPaymentDeadline(),
                    o.getExpectedAmount(),
                    o.getDeclarationStatus(), o.getPaymentStatus(),
                    o.getStatus());
        }
    }
}
