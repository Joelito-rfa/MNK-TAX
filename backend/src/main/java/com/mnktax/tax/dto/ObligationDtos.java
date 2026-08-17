package com.mnktax.tax.dto;

import com.mnktax.tax.entity.ObligationStatus;
import com.mnktax.tax.entity.Periodicity;
import com.mnktax.tax.entity.TaxObligation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public final class ObligationDtos {

    private ObligationDtos() {
    }

    public record CreateObligationRequest(
            @NotNull(message = "L'ID du contribuable est requis.") Long taxpayerId,
            @NotBlank(message = "Le code de l'impôt est requis.") String taxTypeCode,
            @NotNull(message = "La périodicité est requise.") Periodicity periodicity,
            @NotNull(message = "La date de début est requise.") LocalDate startDate,
            LocalDate endDate
    ) {
    }

    public record UpdateObligationRequest(
            @NotNull(message = "La périodicité est requise.") Periodicity periodicity,
            LocalDate endDate,
            @NotNull(message = "Le statut est requis.") ObligationStatus status
    ) {
    }

    public record ObligationDto(Long id, Long taxpayerId, String taxTypeCode, String taxTypeName,
                                Periodicity periodicity, LocalDate startDate, LocalDate endDate,
                                ObligationStatus status) {
        public static ObligationDto from(TaxObligation o) {
            return new ObligationDto(o.getId(), o.getTaxpayer().getId(),
                    o.getTaxType().getCode(), o.getTaxType().getName(),
                    o.getPeriodicity(), o.getStartDate(), o.getEndDate(), o.getStatus());
        }
    }
}
