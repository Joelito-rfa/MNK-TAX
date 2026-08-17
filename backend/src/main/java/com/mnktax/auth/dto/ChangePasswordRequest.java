package com.mnktax.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "L'ancien mot de passe est requis.")
        String currentPassword,

        @NotBlank(message = "Le nouveau mot de passe est requis.")
        @Size(min = 8, max = 100)
        String newPassword
) {
}
