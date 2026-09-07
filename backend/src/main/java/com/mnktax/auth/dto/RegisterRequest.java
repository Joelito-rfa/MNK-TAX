package com.mnktax.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Le nom est requis.")
        @Size(min = 2, max = 80, message = "Le nom doit contenir entre 2 et 80 caractères.")
        @Schema(example = "RAKOTO Jean")
        String name,

        @Size(max = 80)
        @Schema(example = "Jean")
        String firstName,

        @Size(max = 80)
        @Schema(example = "RAKOTO")
        String lastName,

        @NotBlank(message = "L'email est requis.")
        @Email(message = "Email invalide.")
        @Schema(example = "jean@example.mg")
        String email,

        @Size(max = 30)
        @Schema(example = "+261 34 00 000 00")
        String phone,

        @Size(max = 30)
        @Schema(example = "0000409001")
        String nif,

        @Size(max = 500)
        @Schema(example = "Antananarivo")
        String address,

        @NotBlank(message = "Le nom de l'organisation est requis.")
        @Size(min = 2, max = 200, message = "L'organisation doit contenir entre 2 et 200 caractères.")
        @Schema(example = "DGI Antananarivo")
        String organization,

        @Size(max = 100)
        @Schema(example = "Agent fiscal")
        String position,

        @NotBlank(message = "Le rôle est requis.")
        @Schema(example = "Agent fiscal")
        String role,

        @Size(max = 50)
        @Schema(example = "ANA-01")
        String taxCenter,

        @Size(max = 1000, message = "Le message ne doit pas dépasser 1000 caractères.")
        @Schema(example = "J'ai besoin d'un accès pour gérer les déclarations TVA.")
        String message,

        @Size(max = 30)
        @Schema(example = "INDIVIDUAL")
        String requestType
) {
}
