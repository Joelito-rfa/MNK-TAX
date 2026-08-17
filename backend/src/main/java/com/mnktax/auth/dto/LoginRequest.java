package com.mnktax.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Le nom d'utilisateur est requis.")
        @Schema(example = "admin")
        String username,

        @NotBlank(message = "Le mot de passe est requis.")
        @Schema(example = "Admin@123")
        String password
) {
}
