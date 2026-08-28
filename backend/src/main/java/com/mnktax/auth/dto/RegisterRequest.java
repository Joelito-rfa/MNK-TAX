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

        @NotBlank(message = "L'email est requis.")
        @Email(message = "Email invalide.")
        @Schema(example = "jean@example.mg")
        String email,

        @NotBlank(message = "Le nom de l'organisation est requis.")
        @Size(min = 2, max = 200, message = "L'organisation doit contenir entre 2 et 200 caractères.")
        @Schema(example = "DGI Antananarivo")
        String organization,

        @NotBlank(message = "Le rôle est requis.")
        @Schema(example = "Agent fiscal")
        String role,

        @Size(max = 1000, message = "Le message ne doit pas dépasser 1000 caractères.")
        @Schema(example = "J'ai besoin d'un accès pour gérer les déclarations TVA.")
        String message
) {
}
