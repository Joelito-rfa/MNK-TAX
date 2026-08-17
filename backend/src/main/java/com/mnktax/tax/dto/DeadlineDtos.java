package com.mnktax.tax.dto;

import com.mnktax.tax.entity.Deadline;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public final class DeadlineDtos {

    private DeadlineDtos() {
    }

    public record DeadlineRequest(
            @NotBlank(message = "Le code de l'impôt est requis.") String taxTypeCode,
            @NotBlank(message = "La période est requise.") String period,
            @NotNull(message = "La date limite de déclaration est requise.") LocalDate declarationDeadline,
            @NotNull(message = "La date limite de paiement est requise.") LocalDate paymentDeadline
    ) {
    }

    public record DeadlineDto(Long id, String taxTypeCode, String taxTypeName, String period,
                              LocalDate declarationDeadline, LocalDate paymentDeadline) {
        public static DeadlineDto from(Deadline d) {
            return new DeadlineDto(d.getId(), d.getTaxType().getCode(), d.getTaxType().getName(),
                    d.getPeriod(), d.getDeclarationDeadline(), d.getPaymentDeadline());
        }
    }
}
